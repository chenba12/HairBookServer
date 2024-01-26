const express = require('express');
const BookingDTO = require("../entities/Booking");
const {db, isBookingTimeAvailable, isBookingDateValid, verifyAccessToken, checkUserRole} = require("../utils");
const moment = require("moment");
const {DATE_FORMAT, BARBERSHOPS_COLLECTION, BOOKING_COLLECTION, REVIEWS_COLLECTION} = require("../consts");
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
                service: req.body.service,
                date: req.body.date
            }
        );
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
        if (_user_id === updatedBookingData.userId) {
            const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(updatedBookingData._barbershop_id).get();
            const barbershopData = barbershopDoc.data();
            if (!barbershopData) {
                return res.status(404).json('Barbershop not found');
            }
            if (!await isBookingDateValid(updatedBookingData.date, barbershopData, res)) {
                return;
            }
            if (!await isBookingTimeAvailable(updatedBookingData.date, updatedBookingData._barbershop_id, bookingId, res)) {
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
        const _user_id = req.userId;
        const now = moment().format(DATE_FORMAT);
        const closestBookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('userId', '==', userid)
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


module.exports = router