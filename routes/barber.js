const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole, getUserDetails} = require('../utils');
const BarberShopDTO = require('../entities/BarberShop')
const BookingDTO = require('../entities/Booking')
const Message = require('../entities/Message')
const {BOOKING_COLLECTION, BARBERSHOPS_COLLECTION, USERS_COLLECTION} = require("../consts");
const User = require("../entities/User");
const ServiceDTO = require("../entities/Service");

router.get('/get-barber-details', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(new Message('Barber details retrieved successfully', req.userDetails, 1));
    }, 'Barber');
});

// barbershop id, barbershop name, opening hours, services
router.post('/create-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const data = new BarberShopDTO(req.body)
        const plainObject = {...data};
        console.log(plainObject)
        const writeResult = await db.collection(BARBERSHOPS_COLLECTION).doc().set(plainObject);
        res.status(200).json(new Message('BarberShop created successfully', plainObject, 1));
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format', null, 0));
    }
});
router.get('/get-my-barbershops', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const userId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('_barber_id', '==', userId)
            .get();
        if (barbershopsSnapshot.empty) {
            return res.status(404).json(new Message('No barbershops found for the user', null, 0));
        }
        const barbershops = barbershopsSnapshot.docs.map(doc => doc.data());
        return res.status(200).json(new Message('Barbershops retrieved successfully', barbershops, 1));
    } catch (error) {
        console.error('Error in get_my_barbershops:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
router.get('/get-barbershop-by-id', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershop_id;
        const barberId = req.userId;
        if (!barbershopId || !barberId) {
            return res.status(400).json(new Message('Please provide valid barbershop and barber IDs', null, 0));
        }
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).get();
        if (!barbershopDoc.exists) {
            return res.status(404).json(new Message('Barbershop not found', null, 0));
        }
        const barbershopData = barbershopDoc.data();
        return res.status(200).json(new Message('Barbershop retrieved successfully', barbershopData, 1));
    } catch (error) {
        console.error('Error in get_barbershop_by_id:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
// barbershop id
router.delete('/delete-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershop_id;
        const barberId = req.userId;

        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).delete();
        return res.status(200).json(new Message('Barbershop deleted successfully', null, 1));
    } catch (error) {
        console.error('Error in delete_barbershop:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
// barbershop id, barbershop name, opening hours, services
router.put('/update-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershop_id;
        const barberId = req.userId;
        if (!barbershopId || !barberId) {
            return res.status(400).json(new Message('Please provide valid barbershop and barber IDs', null, 0));
        }
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const updatedData = req.body;
        await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).update(updatedData);
        return res.status(200).json(new Message('Barbershop updated successfully', updatedData, 1));
    } catch (error) {
        console.error('Error in update_barbershop:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
// nothing
router.get('/my_bookings', async (req, res) => {
    const barbershop_id = req.query.barbershop_id;
    console.log(barbershop_id);
    const booking_snapshot = await db.collection(BOOKING_COLLECTION).where("_barbershop_id", "==", barbershop_id).get();
    if (booking_snapshot.empty) {
        const error1 = new Message("There Is No Bookings Available", null, 0);
        return res.status(404).send(error1);
    }
    const bookings = []
    await booking_snapshot.forEach(doc => {
        const booking = new BookingDTO(doc.data());
        bookings.push(Object.assign({}, {"id": doc.id}, booking));
    })
    console.log(bookings);
    const success = new Message("Your Bookings Is:", bookings, 1);
    res.send(success);
});
// id, booking id, date
router.put('/update_booking', async (req, res) => {
    try {
        const _barber_id = req.query.barber_id;
        const barbershop_id = req.query.barbershop_id;
        const booking_id = req.query.booking_id;
        // Check if the user is authorized to delete the booking
        const barber_shop_snapshot = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershop_id).get();
        const barber_shop_data = barber_shop_snapshot.data();
        if (_barber_id === barber_shop_data._barber_id) {
            const data = new BookingDTO(req.body);
            const plainObject = {...data};
            // User is authorized, proceed with deletion
            const update = await db.collection(BOOKING_COLLECTION).doc(booking_id).update(plainObject);
            const success = new Message("Booking updated successfully!", update, 1);
            res.status(200).send(success);
        } else {
            // Unauthorized access
            const error = new Message("You can't update this Booking!", null, 0);
            res.status(401).send(error);
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or Booking not found'});
    }
});
//booking id
router.delete('/delete_booking', async (req, res) => {
    try {
        const _barber_id = req.query.barber_id;
        const barbershop_id = req.query.barbershop_id;
        const booking_id = req.query.booking_id;
        // Check if the user is authorized to delete the booking
        const barber_shop_snapshot = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershop_id).get();
        const barber_shop_data = barber_shop_snapshot.data();
        if (_barber_id === barber_shop_data._barber_id) {
            // User is authorized, proceed with deletion
            await db.collection(BOOKING_COLLECTION).doc(booking_id).delete();
            const success = new Message("Booking deleted successfully!", null, 1);
            res.status(200).send(success);
        } else {
            // Unauthorized access
            const error = new Message("You can't delete this Booking!", null, 0);
            res.status(401).send(error);
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or Booking not found'});
    }
});

const checkBarbershopOwnership = async (barbershopId, barberId) => {
    try {
        if (!barbershopId) {
            return { isValid: false, message: 'Please provide a valid barbershop ID' };
        }

        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).get();

        if (!barbershopDoc.exists) {
            return { isValid: false, message: 'Barbershop not found' };
        }

        const barbershopData = barbershopDoc.data();

        // Check if the barbershop belongs to the specified barber
        if (barbershopData._barber_id !== barberId) {
            return { isValid: false, message: 'Barbershop does not belong to the specified barber' };
        }

        return { isValid: true, message: 'Ownership check passed' };
    } catch (error) {
        console.error('Error in checkBarbershopOwnership:', error);
        return { isValid: false, message: 'Internal server error' };
    }
};
// nothing
module.exports = router;