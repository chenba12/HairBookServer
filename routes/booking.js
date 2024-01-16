var express = require('express');
const BookingDTO = require("../entities/Booking");
const {db} = require("../firebase-admin-init");
var router = express.Router();

router.post(('/bookhaircut'), async (req, res) => {
    try {
// Directly create an instance of BookingDTO using req.body
        const data = new BookingDTO(req.body);
        const plainObject = {...data};
        // Send a response or perform other actions
        const write_result = await db.collection('Bookings').doc().set(plainObject);
        res.status(200).json({message: 'Your booking has been sent!', data: BookingDTO});
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format'});
    }
});

// barbershop id, book id, date
router.put(('/updatebooking'), async (req, res) => {
    try {
        const _user_id = req.query.user_id
        const bookingId = req.query.booking_id
        // Directly create an instance of BookingDTO using req.body
        const updatedBookingData = new BookingDTO(req.body);

        if (_user_id === updatedBookingData._user_id) {
            const updatedBookingObject = {...updatedBookingData};
            const updateResult = await db.collection('Bookings').doc(bookingId).update(updatedBookingObject);
            res.status(200).json({message: 'Booking updated successfully!', data: updatedBookingObject});
        }
        res.status(401).json({message: 'Cant update =['})
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or booking not found'});
    }
});
// book id
router.delete(('/deletebooking'), async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        const bookingId = req.query.booking_id;
        // Check if the user is authorized to delete the booking
        const bookingSnapshot = await db.collection('Bookings').doc(bookingId).get();
        const bookingData = bookingSnapshot.data();
        if (_user_id === bookingData._user_id) {
            // User is authorized, proceed with deletion
            await db.collection('Bookings').doc(bookingId).delete();
            res.status(200).json({message: 'Booking deleted successfully!'});
        } else {
            // Unauthorized access
            res.status(401).json({message: 'Unauthorized access to delete this booking'});
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or booking not found'});
    }
});

module.exports = router