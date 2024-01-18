const express = require('express');
const {db} = require("../utils");
const ReviewDTO = require("../entities/Review");
const router = express.Router();
const Message = require("../entities/Message");
const moment = require("moment");

//Create new review
router.post('/createNewReview', async (req, res) => {
    try {
        // Directly create an instance of ReviewDTO using req.body
        const reviewDTO = new ReviewDTO(req.body);
        const data = { ...reviewDTO };
        //Verify that the customer has already been into his booking, if not he cannot leave a review
        const booking = await db.collection('Bookings').doc(reviewDTO.booking_id).get();
        const currentDate = moment.now()
        const targetDateString = booking.data().time;
// Parse the target date string into a Date object
        const targetDate = moment(targetDateString);
        if (!booking.exists) {
            const error1 = new Message("There is no such booking",null,0);
            res.status(404).json(error1)
        }
        else if (targetDate < currentDate) {
            const error1 = new Message("Giving a review is available only after the booking has been done.",null,0);
            res.status(400).json(error1);
        }
        else {
            const write_result = await db.collection('Reviews').doc().set(data);
            res.status(200).json({message: 'Review created successfully', review: reviewDTO});
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format'});
    }
});
// barbershop id
router.delete(('/deleteReview'), async (req, res) => {
    try {
        const _user_id = req.query.user_id;
        const review_id = req.query.review_id;
        // Check if the user is authorized to delete the booking
        const reviewSnapshot = await db.collection('Reviews').doc(review_id).get();
        const reviewData = reviewSnapshot.data();
        console.log(reviewData)
        if (_user_id === reviewData._user_id) {
            // User is authorized, proceed with deletion
            await db.collection('Reviews').doc(review_id).delete();
            res.status(200).json({message: 'Review deleted successfully!'});
        } else {
            // Unauthorized access
            res.status(401).json({message: 'Unauthorized access to delete this review'});
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or review not found'});
    }
});
// barbershop id, barbershop name, opening hours, services

// nothing
router.get('/getAllReviews', (req, res) => {
    const barber_id = req.query._barbershop_id; // Get the barber shop id to add review to it's page
});


module.exports = router;