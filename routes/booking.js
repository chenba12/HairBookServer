const express = require('express');
const BookingDTO = require("../entities/Booking");
const {db, isBookingTimeAvailable, isBookingDateValid} = require("../utils");
const moment = require("moment");
const {DATE_FORMAT, BARBERSHOPS_COLLECTION, BOOKING_COLLECTION} = require("../consts");
const router = express.Router();
const Message = require("../entities/Message");


router.post(('/book-haircut'), async (req, res) => {
    try {
        const bookingData = new BookingDTO(req.body);

        // Fetch the barbershop details
        const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(bookingData._barbershop_id).get();
        const barbershopData = barbershopDoc.data();

        if (!barbershopData) {
            return res.status(404).json(new Message('Barbershop not found', null, 0));
        }

        // Check if the booking date is valid
        if (!await isBookingDateValid(bookingData.date, barbershopData, res)) {
            return;
        }

        // Check if there is no other booking at the same time and date
        if (!await isBookingTimeAvailable(bookingData.date, bookingData._barbershop_id, null, res)) {
            return;
        }

        // If all checks pass, create a new booking
        const bookingPlainObject = {...bookingData};
        await db.collection(BOOKING_COLLECTION).doc().set(bookingPlainObject);
        res.status(200).json(new Message('Your booking has been sent!', bookingPlainObject, 1));
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format', null, 0));
    }
});

// barbershop id, book id, date
router.put(('/update-booking'), async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        const bookingId = req.query.booking_id;
        const updatedBookingData = new BookingDTO(req.body);
        if (_user_id === updatedBookingData._user_id) {
            const barbershopDoc = await db.collection(BARBERSHOPS_COLLECTION).doc(updatedBookingData._barbershop_id).get();
            const barbershopData = barbershopDoc.data();
            if (!barbershopData) {
                return res.status(404).json(new Message('Barbershop not found', null, 0));
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

            res.status(200).json(new Message('Booking updated successfully!', updatedBooking, 1));
        } else {
            // Unauthorized access
            res.status(401).json(new Message('Unauthorized access to update this booking', null, 0));
        }
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format or booking not found', null, 0));
    }
});
// book id
router.delete(('/delete-booking'), async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        const bookingId = req.query.booking_id;
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION).doc(bookingId).get();
        const bookingData = bookingSnapshot.data();
        if (bookingData && _user_id === bookingData._user_id) {
            await db.collection(BOOKING_COLLECTION).doc(bookingId).delete();
            res.status(200).json(new Message('Booking deleted successfully!', null, 1));
        } else {
            res.status(401).json(new Message('Unauthorized access or booking not found', null, 0));
        }
    } catch (error) {
        console.error(error);
        res.status(400).json(new Message('Invalid data format or booking not found', null, 0));
    }
});

router.get('/user-bookings', async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        console.log("hey")
        const bookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('_user_id', '==', _user_id)
            .orderBy('date')
            .get();
        console.log("hey")
        if (bookingSnapshot.empty) {
            return res.status(404).json(new Message('No bookings found for the user', null, 0));
        }
        const bookings = [];
        bookingSnapshot.forEach(doc => {
            const booking = new BookingDTO(doc.data());
            bookings.push(Object.assign({}, {"id": doc.id}, booking));
        });
        return res.status(200).json(new Message('User bookings retrieved successfully', bookings, 1));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});


router.get('/closest-booking', async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        const now = moment().format(DATE_FORMAT);
        const closestBookingSnapshot = await db.collection(BOOKING_COLLECTION)
            .where('_user_id', '==', _user_id)
            .where('date', '>=', now)
            .orderBy('date')
            .limit(1)
            .get();

        if (closestBookingSnapshot.empty) {
            return res.status(404).json(new Message('No upcoming bookings found for the user', null, 0));
        }
        const closestBooking = new BookingDTO(closestBookingSnapshot.docs[0].data());
        return res.status(200).json(new Message('Closest upcoming booking retrieved successfully', closestBooking, 1));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});

module.exports = router