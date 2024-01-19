const express = require('express');
const {db, verifyAccessToken, checkUserRole} = require("../utils");
const ReviewDTO = require("../entities/Review");
const router = express.Router();
const Message = require("../entities/Message");
const moment = require("moment");
const {BOOKING_COLLECTION, REVIEWS_COLLECTION} = require("../consts");

router.post('/post-review', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const reviewData = new ReviewDTO(req.body);
        const barbershopId = reviewData._barbershop_id;
        const userId = req.userId;
        const existingReview = await db.collection(REVIEWS_COLLECTION)
            .where('_user_id', '==', userId)
            .where('_barbershop_id', '==', barbershopId)
            .get();
        if (!existingReview.empty) {
            return res.status(403).json(new Message('You have already posted a review for this barbershop', null, 0));
        }
        const pastBooking = await db.collection(BOOKING_COLLECTION)
            .where('_user_id', '==', userId)
            .where('_barbershop_id', '==', barbershopId)
            .where('date', '<', moment().format('DD-MM-YYYY HH:mm'))
            .orderBy('date', 'desc')
            .limit(1)
            .get();

        if (pastBooking.empty) {
            return res.status(403).json(new Message('You cannot post a review without a past booking at this barbershop', null, 0));
        }
        const plainObject = {...reviewData};
        const reviewRef = await db.collection(REVIEWS_COLLECTION).add(plainObject);
        const reviewId = reviewRef.id;
        const plainReviewObject = { review_id: reviewId, ...reviewData };
        return res.status(200).json(new Message('Review posted successfully', plainReviewObject, 1));
    } catch (error) {
        console.error('Error in post_review:', error);
        return res.status(500).json(new Message('Internal server error', null, 0));
    }
});
router.delete('/delete-review', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const userId = req.userId;
        const reviewId = req.query.review_id;
        const isAuthorized = await checkReviewOwnership(userId, reviewId);
        if (isAuthorized) {
            await db.collection(REVIEWS_COLLECTION).doc(reviewId).delete();
            res.status(200).json({message: 'Review deleted successfully!'});
        } else {
            res.status(401).json({message: 'Unauthorized access to delete this review'});
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({error: 'Invalid data format or review not found'});
    }
});
router.put('/update-review', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const userId = req.userId;
        const reviewId = req.query.review_id;
        const isAuthorized = await checkReviewOwnership(userId, reviewId);
        if (isAuthorized) {
            const updatedReviewData = new ReviewDTO(req.body);
            const plainReviewObject = { ...updatedReviewData };
            await db.collection(REVIEWS_COLLECTION).doc(reviewId).update(plainReviewObject);
            res.status(200).json(new Message('Review updated successfully', plainReviewObject, 1));
        } else {
            res.status(401).json({ message: 'Unauthorized access to update this review' });
        }
    } catch (error) {
        console.error('Error in update-review:', error);
        res.status(400).json(new Message('Invalid data format or review not found', null, 0));
    }
});

router.get('/get-my-reviews', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const userId = req.userId;
        const userReviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('_user_id', '==', userId)
            .get();

        const userReviews = userReviewsSnapshot.docs.map(doc => {
            const reviewData = doc.data();
            return { review_id: doc.id, ...reviewData };
        });

        res.status(200).json(new Message('User reviews retrieved successfully', { reviews: userReviews }, 1));
    } catch (error) {
        console.error('Error in get-my-reviews:', error);
        res.status(500).json(new Message('Internal server error', null, 0));
    }
});

const checkReviewOwnership = async (userId, reviewId) => {
    try {
        const reviewSnapshot = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();
        const reviewData = reviewSnapshot.data();
        return userId === reviewData._user_id;
    } catch (error) {
        console.error(error);
        return false;
    }
};
module.exports = router;