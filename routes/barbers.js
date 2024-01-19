const express = require('express');
const router = express.Router();
const {db} = require('../utils');
const BarberShopDTO = require('../entities/BarberShop')
const BookingDTO = require('../entities/Booking')
const Message = require('../entities/Message')
const {BOOKING_COLLECTION, BARBERSHOPS_COLLECTION} = require("../consts");

// barbershop id, barbershop name, opening hours, services
router.post('/create_barbershop', async (req, res) => {
    try {
        // Directly create an instance of BarberShopDTO using req.body
        const data = new BarberShopDTO(req.body);
        const plainObject = {...data};
        // Further processing or validation logic can be added here
        // Send a response or perform other actions
        const write_result = await db.collection(BARBERSHOPS_COLLECTION).doc().set(plainObject);
        res.status(200).json({message: 'BarberShop created successfully', data: BarberShopDTO});
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format'});
    }
});
router.get('/get_my_barbershops', async (req, res) => {

});
// barbershop id
router.delete(('/delete_barbershop'), (req, res) => {
    // Assuming the user and barbershop details are sent in the request body
    const {user, barbershop} = req.body;
    // Check if user.id is equal to barbershop.barber.id
    if (user && user.id && barbershop && barbershop.barber && barbershop.barber.id && user.id === barbershop.barber.id) {
        // User is authorized to delete the barbershop
        // Implement your delete logic here

        // Example response if deletion is successful
        return res.status(200).json({message: 'Barbershop deleted successfully.'});
    } else {
        // User is not authorized to delete the barbershop
        return res.status(403).json({error: 'Unauthorized. User cannot delete this barbershop.'});
    }
});
// barbershop id, barbershop name, opening hours, services
router.put('/update_barbershop', (req, res) => {

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
            await db.collection('Bookings').doc(booking_id).delete();
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
// nothing
module.exports = router;