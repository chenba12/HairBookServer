const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole, getUserDetails} = require('../utils');
const BarberShopDTO = require('../entities/BarberShop')
const BookingDTO = require('../entities/Booking')
const Message = require('../entities/Message')
const {
    BOOKING_COLLECTION,
    BARBERSHOPS_COLLECTION,
    REVIEWS_COLLECTION,
    DATE_FORMAT, SERVICES_COLLECTION
} = require("../consts");
const moment = require("moment");
const ServiceDTO = require("../entities/Service");

router.get('/get-barber-details', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(new Message('Barber details retrieved successfully', req.userDetails, 1));
    }, 'Barber');
});

router.post('/create-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const data = new BarberShopDTO(req.body)
        const plainObject = {...data};

        const docRef = await (await db.collection(BARBERSHOPS_COLLECTION).add(plainObject)).get();
        const responseData = {...plainObject, barbershopId: docRef.id};
        res.status(200).json(new Message('BarberShop created successfully', responseData, 1));
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format', null, 0));
    }
});
router.get('/get-my-barbershops', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const userId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', userId)
            .get();
        if (barbershopsSnapshot.empty) {
            return res.status(404).json(new Message('No barbershops found for the user', null, 0));
        }
        const barbershops = barbershopsSnapshot.docs.map(doc => {
            const barbershopData = doc.data();
            return {...barbershopData, barbershopId: doc.id};
        });
        return res.status(200).json(new Message('Barbershops retrieved successfully', barbershops, 1));
    } catch (error) {
        console.error('Error in get_my_barbershops:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
router.get('/get-barbershop-by-id', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
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
        console.error('Error in barbershop:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
router.delete('/delete-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
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
router.put('/update-barbershop', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;
        if (!barbershopId || !barberId) {
            res.status(400).json(new Message('Please provide valid barbershop and barber IDs', null, 0));
        }
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const updatedData = req.body;
        await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).update(updatedData);
        res.status(200).json(new Message('Barbershop updated successfully', updatedData, 1));
    } catch (error) {
        console.error('Error in update_barbershop:', error);
        res.status(500).json(new Message('Internal server error', null, 0));
    }
});

router.get('/get-reviews', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;
        const barberId = req.userId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barbershopId', '==', barbershopId)
            .get();
        const barbershopReviews = reviewsSnapshot.docs.map(doc => {
            const reviewData = doc.data();
            return {review_id: doc.id, ...reviewData};
        });
        res.status(200).json(new Message('Barbershop reviews retrieved successfully', {reviews: barbershopReviews}, 1));
    } catch (error) {
        console.error('Error in get-reviews:', error);
        res.status(500).json(new Message('Internal server error', null, 0));
    }
});

router.get('/get-closest-booking', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopsSnapshot = await db.collection(BARBERSHOPS_COLLECTION)
            .where('barberId', '==', barberId)
            .get();

        if (barbershopsSnapshot.empty) {
            return res.status(404).json(new Message('No barbershops found for the barber', null, 0));
        }

        let closestBooking = null;
        let closestBarbershopId = null;
        let upcomingBookingSnapshot = null;

        for (const barbershopDoc of barbershopsSnapshot.docs) {
            const barbershopId = barbershopDoc.id;

            const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
            if (!ownershipCheck.isValid) {
                return res.status(403).json(new Message(ownershipCheck.message, null, 0));
            }

            const currentBookingSnapshot = await db.collection(BOOKING_COLLECTION)
                .where('barbershopId', '==', barbershopId)
                .where('date', '>=', moment().format(DATE_FORMAT))
                .orderBy('date')
                .limit(1)
                .get();

            if (!currentBookingSnapshot.empty) {
                const bookingData = currentBookingSnapshot.docs[0].data();
                const bookingDate = moment(bookingData.date, DATE_FORMAT);

                if (!closestBooking || bookingDate.isBefore(moment(closestBooking.date, DATE_FORMAT))) {
                    closestBooking = bookingData;
                    closestBarbershopId = barbershopId;
                    upcomingBookingSnapshot = currentBookingSnapshot;
                }
            }
        }

        if (!closestBooking) {
            return res.status(404).json(new Message('No upcoming bookings found for the barber', null, 0));
        }

        const closestBookingWithId = Object.assign({}, {
            "barbershopId": closestBarbershopId,
            "bookingId": upcomingBookingSnapshot.docs[0].id
        }, closestBooking);
        return res.status(200).json(new Message('Closest upcoming booking retrieved successfully', closestBookingWithId, 1));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});


router.get('/my-bookings', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;

        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }

        const bookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where("barbershopId", "==", barbershopId)
            .get();

        if (bookingSnapshot.empty) {
            return res.status(404).json(new Message("There are no bookings available for this barbershop", null, 0));
        }

        const currentDateTime = moment();
        const bookings = [];

        bookingSnapshot.forEach(doc => {
            const bookingData = doc.data();
            const bookingDate = moment(bookingData.date, DATE_FORMAT);

            if (bookingDate.isAfter(currentDateTime)) {
                const booking = new BookingDTO(bookingData);
                bookings.push(Object.assign({}, {"bookingId": doc.id}, booking));
            }
        });

        res.status(200).json(new Message("Your upcoming bookings are:", bookings, 1));
    } catch (error) {
        console.error(error);
        res.status(500).json(new Message("Internal server error", null, 0));
    }
});

router.delete('/delete-booking', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const bookingId = req.query.bookingId;

        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }

        await db.collection(BOOKING_COLLECTION).doc(bookingId).delete();

        res.status(200).json(new Message("Booking deleted successfully!", null, 1));
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format or booking not found', null, 1));
    }
});


const checkBarbershopOwnership = async (barbershopId, barberId) => {
    try {
        if (!barbershopId) {
            return {isValid: false, message: 'Please provide a valid barbershop ID'};
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barbershopId).get();
        if (!barbershopDoc.exists) {
            return {isValid: false, message: 'Barbershop not found'};
        }
        const barbershopData = barbershopDoc.data();
        // Check if the barbershop belongs to the specified barber
        if (barbershopData.barberId !== barberId) {
            return {isValid: false, message: 'Barbershop does not belong to the specified barber'};
        }

        return {isValid: true, message: 'Ownership check passed'};
    } catch (error) {
        console.error('Error in checkBarbershopOwnership:', error);
        return {isValid: false, message: 'Internal server error'};
    }
};

router.post('/create-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const serviceData = new ServiceDTO({
            serviceName: req.body.serviceName,
            price: req.body.price,
            barbershopId: barbershopId,
        });
        const plainObject = {...serviceData};
        const serviceDocRef = await db.collection(SERVICES_COLLECTION).add(plainObject);
        const serviceId = serviceDocRef.id;
        const servicePlainObject = {...serviceData, "serviceId": serviceId};
        return res.status(200).json(new Message('Service created successfully', servicePlainObject, 1));
    } catch (error) {
        console.error('Error in create-service:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});

router.delete('/delete-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        await db.collection(SERVICES_COLLECTION).doc(serviceId).delete();
        return res.status(200).json(new Message('Service deleted successfully', null, 1));
    } catch (error) {
        console.error('Error in delete-service:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});

router.put('/update-service', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barberId = req.userId;
        const barbershopId = req.query.barbershopId;
        const serviceId = req.query.serviceId;
        const ownershipCheck = await checkBarbershopOwnership(barbershopId, barberId);
        if (!ownershipCheck.isValid) {
            return res.status(403).json(new Message(ownershipCheck.message, null, 0));
        }
        const updatedServiceData = new ServiceDTO(req.body);
        const plainServiceObject = {...updatedServiceData};
        await db.collection(SERVICES_COLLECTION).doc(serviceId).update(plainServiceObject);
        return res.status(200).json(new Message('Service updated successfully', plainServiceObject, 1));
    } catch (error) {
        console.error('Error in update-service:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});

router.get('/get-services', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;

        const servicesSnapshot = await db.collection(SERVICES_COLLECTION)
            .where('barbershopId', '==', barbershopId)
            .get();

        const services = servicesSnapshot.docs.map(doc => {
            const serviceData = doc.data();
            return {serviceId: doc.id, ...serviceData};
        });

        return res.status(200).json(new Message('Services retrieved successfully', services, 1));
    } catch (error) {
        console.error('Error in get-services:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
module.exports = router;