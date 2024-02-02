const express = require('express');
const BookingDTO = require("../entities/Booking");
const {db, isBookingTimeAvailable, isBookingDateValid, verifyAccessToken, checkUserRole} = require("../utils");
const moment = require("moment");
const {
    DATE_FORMAT,
    BARBERSHOPS_COLLECTION,
    BOOKING_COLLECTION,
    REVIEWS_COLLECTION,
    SERVICES_COLLECTION
} = require("../consts");
const router = express.Router();


router.post(('/book-haircut'), verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const barberShopId = req.body.barberShopId;
        const bookingData = new BookingDTO(
            {
                userId: req.userId,
                barberShopId: barberShopId,
                barberShopName: req.body.barberShopName,
                barberName: req.body.barberName,
                customerName: req.body.customerName,
                serviceId: req.body.serviceId,
                date: req.body.date
            }
        );
        const serviceDoc = await db.collection(SERVICES_COLLECTION).doc(bookingData.serviceId).get();
        const serviceData = serviceDoc.data();
        if (!serviceData || serviceData.barberShopId !== bookingData.barberShopId) {
            return res.status(400).json('Not a valid service');
        }
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).get();
        const barbershopData = barbershopDoc.data();
        if (!barbershopData) {
            return res.status(404).json('Barbershop not found');
        }
        if (!await isBookingDateValid(bookingData.date, barbershopData, res)) {
            return;
        }
        if (!await isBookingTimeAvailable(bookingData.date, bookingData.barberShopId, null, res)) {
            return;
        }
        const plainObject = {...bookingData};
        const bookingRef = await db.collection(BOOKING_COLLECTION).add(plainObject);
        const bookingPlainObject = {bookingId: bookingRef.id, ...bookingData};
        res.status(200).json(bookingPlainObject);
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format');
    }
});

router.put(('/update-booking'), verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const _user_id = req.userId;
        const bookingId = req.query.bookingId;
        const updatedBookingData = new BookingDTO(req.body);
        const serviceDoc = await db.collection(SERVICES_COLLECTION).doc(updatedBookingData.serviceId).get();
        const serviceData = serviceDoc.data();
        if (!serviceData || serviceData.barberShopId !== updatedBookingData.barberShopId) {
            return res.status(400).json('Invalid serviceId or barberShopId');
        }
        if (_user_id === updatedBookingData.userId) {
            const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(updatedBookingData.barberShopId).get();
            const barbershopData = barbershopDoc.data();
            if (!barbershopData) {
                return res.status(404).json('Barbershop not found');
            }
            if (!await isBookingDateValid(updatedBookingData.date, barbershopData, res)) {
                return;
            }
            if (!await isBookingTimeAvailable(updatedBookingData.date, updatedBookingData.barberShopId, bookingId, res)) {
                return;
            }
            const updatedBookingObject = {...updatedBookingData};
            await db.collection(BOOKING_COLLECTION).doc(bookingId).update(updatedBookingObject);
            const updatedBookingSnapshot = await db.collection(BOOKING_COLLECTION).doc(bookingId).get();
            const updatedBooking = new BookingDTO(updatedBookingSnapshot.data());

            res.status(200).json(updatedBooking)
        } else {
            // Unauthorized access
            res.status(401).json('Unauthorized access to update this booking');
        }
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format or booking not found');
    }
});
router.delete(('/delete-booking'), verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const _user_id = req.userId
        const bookingId = req.query.bookingId;
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION).doc(bookingId).get();
        const bookingData = bookingSnapshot.data();
        if (bookingData && _user_id === bookingData.userId) {
            await db.collection(BOOKING_COLLECTION).doc(bookingId).delete();
            res.status(200).json('Booking deleted successfully!')
        } else {
            res.status(401).json('Unauthorized access or booking not found');
        }
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format or booking not found');
    }
});

router.get('/user-bookings', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const userId = req.userId;
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('userId', '==', userId)
            .orderBy('date')
            .get();
        if (bookingSnapshot.empty) {
            return res.status(404).json('No bookings found for the user');
        }
        const bookings = [];
        for (const doc of bookingSnapshot.docs) {
            const booking = new BookingDTO(doc.data());
            const bookingWithId = Object.assign({}, {"bookingId": doc.id}, booking);
            bookings.push(bookingWithId);
        }
        return res.status(200).json(bookings)
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});


router.get('/closest-booking', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const userId = req.userId;
        const now = moment().format(DATE_FORMAT);
        const closestBookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('userId', '==', userId)
            .where('date', '>=', now)
            .orderBy('date')
            .limit(1)
            .get();
        if (closestBookingSnapshot.empty) {
            return res.status(404).json('No upcoming bookings found for the user');
        }
        const closestBookingDoc = closestBookingSnapshot.docs[0];
        const closestBookingData = closestBookingDoc.data();
        const closestBooking = new BookingDTO(closestBookingData);
        const bookingId = closestBookingDoc.id;
        return res.status(200).json({bookingId, ...closestBooking})
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});

router.get('/get-service-by-id', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const serviceDoc = await db.collection(SERVICES_COLLECTION).doc(serviceId).get();
        if (!serviceDoc.exists) {
            return res.status(404).json('Service not found');
        }
        const serviceData = serviceDoc.data();
        return res.status(200).json(serviceData);
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});
router.get('/get-all-services-by-barbershop', verifyAccessToken, async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const servicesSnapshot = await db.collection(SERVICES_COLLECTION).where('barberShopId', '==', barberShopId).get();
        if (servicesSnapshot.empty) {
            return res.status(404).json('No services found for this barbershop');
        }
        const services = [];
        servicesSnapshot.forEach(doc => {
            const serviceData = doc.data();
            services.push({serviceId: doc.id, ...serviceData});
        });
        return res.status(200).json(services);
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});

router.get('/get-available-booking-by-day', verifyAccessToken, async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const date = req.query.date;
        const dayOfWeek = moment(date, DATE_FORMAT).format('dddd').toLowerCase();
        const barberShopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).get();
        if (!barberShopDoc.exists) {
            return res.status(404).json('Barbershop not found');
        }
        const barberShopData = barberShopDoc.data();
        console.log(dayOfWeek)
        const workingHours = barberShopData[`${dayOfWeek}Hours`];

        const bookingsSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('barberShopId', '==', barberShopId)
            .where('date', '>=', moment(date, DATE_FORMAT).startOf('day').format(DATE_FORMAT))
            .where('date', '<=', moment(date, DATE_FORMAT).endOf('day').format(DATE_FORMAT))
            .get();

        const bookings = bookingsSnapshot.docs.map(doc => doc.data());

        const availability = workingHours.map(time => {
            const bookingExists = bookings.some(booking => moment(booking.date, "DD-MM-YYYY HH:mm").format('HH:mm') === time);
            return !bookingExists;
        });

        return res.status(200).json(availability);
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});

router.get('/get-booking-by-id', verifyAccessToken, async (req, res) => {
    try {
        const bookingId = req.query.bookingId;
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION).doc(bookingId).get();
        if (!bookingSnapshot.exists) {
            return res.status(404).json('Booking not found');
        }
        const bookingData = bookingSnapshot.data();
        return res.status(200).json({bookingId: bookingSnapshot.id, ...bookingData});
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});

module.exports = router