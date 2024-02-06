const express = require('express');
const {db, verifyAccessToken, checkUserRole} = require("../utils");
const ReviewDTO = require("../entities/Review");
const router = express.Router();
const moment = require("moment");
const {BOOKING_COLLECTION, REVIEWS_COLLECTION, BARBERSHOPS_COLLECTION, CUSTOMER_ROLE} = require("../consts");

router.post('/post-review', verifyAccessToken, checkUserRole([CUSTOMER_ROLE]), async (req, res) => {
    try {
        const reviewData = new ReviewDTO(req.body);
        const barberShopId = reviewData.barberShopId;
        const userId = req.userId;
        const existingReview = await db.collection(REVIEWS_COLLECTION)
            .where('userId', '==', userId)
            .where('barberShopId', '==', barberShopId)
            .get();
        if (!existingReview.empty) {
            return res.status(403).json('You have already posted a review for this barbershop');
        }
        const pastBooking = await db.collection(BOOKING_COLLECTION)
            .where('userId', '==', userId)
            .where('barberShopId', '==', barberShopId)
            .where('date', '<', moment().format('DD-MM-YYYY HH:mm'))
            .orderBy('date', 'desc')
            .limit(1)
            .get();

        // if (pastBooking.empty) {
        //     return res.status(403).json('You cannot post a review without a past booking at this barbershop');
        // }
        const plainObject = {...reviewData};
        const reviewRef = await db.collection(REVIEWS_COLLECTION).add(plainObject);
        const reviewId = reviewRef.id;
        const plainReviewObject = {reviewId: reviewId, ...reviewData};
        await updateBarberShopRating(barberShopId);
        return res.status(200).json(plainReviewObject);
    } catch (error) {
        console.error('Error in post_review:', error);
        return res.status(500).json('Internal server error');
    }
});
router.delete('/delete-review', verifyAccessToken, checkUserRole([CUSTOMER_ROLE]), async (req, res) => {
    try {
        const userId = req.userId;
        const reviewId = req.query.reviewId;
        const isAuthorized = await checkReviewOwnership(userId, reviewId);
        if (isAuthorized) {
            const reviewSnapshot = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();
            const reviewData = reviewSnapshot.data();
            const barberShopId = reviewData.barberShopId;
            await db.collection(REVIEWS_COLLECTION).doc(reviewId).delete();
            await updateBarberShopRating(barberShopId);
            res.status(200).json('Review deleted successfully!');
        } else {
            res.status(401).json('Unauthorized access to delete this review');
        }
    } catch (error) {
        console.error(error);
        res.status(400).json('Invalid data format or review not found');
    }
});
router.put('/update-review', verifyAccessToken, checkUserRole([CUSTOMER_ROLE]), async (req, res) => {
    try {
        const userId = req.userId;
        const reviewId = req.query.reviewId;
        const isAuthorized = await checkReviewOwnership(userId, reviewId);
        if (isAuthorized) {
            const updatedReviewData = new ReviewDTO(req.body);
            const plainReviewObject = {...updatedReviewData};
            await db.collection(REVIEWS_COLLECTION).doc(reviewId).update(plainReviewObject);
            await updateBarberShopRating(updatedReviewData.barberShopId);
            res.status(200).json(plainReviewObject);
        } else {
            res.status(401).json({message: 'Unauthorized access to update this review'});
        }
    } catch (error) {
        console.error('Error in update-review:', error);
        res.status(400).json('Invalid data format or review not found');
    }
});

router.get('/get-my-reviews', verifyAccessToken, checkUserRole([CUSTOMER_ROLE]), async (req, res) => {
    try {
        const userId = req.userId;
        const userReviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('userId', '==', userId)
            .get();
        const userReviews = userReviewsSnapshot.docs.map(doc => {
            const reviewData = doc.data();
            return {reviewId: doc.id, ...reviewData};
        });
        res.status(200).json(userReviews);
    } catch (error) {
        console.error('Error in get-my-reviews:', error);
        res.status(500).json('Internal server error');
    }
});


router.get('/get-review-by-id', verifyAccessToken, checkUserRole([CUSTOMER_ROLE]), async (req, res) => {
    try {
        const reviewId = req.query.reviewId;
        const reviewSnapshot = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();
        if (reviewSnapshot.exists) {
            const reviewData = reviewSnapshot.data();
            res.status(200).json({reviewId: reviewSnapshot.id, ...reviewData});
        } else {
            res.status(404).json('Review not found');
        }
    } catch (error) {
        console.error('Error in get-review-by-id:', error);
        res.status(500).json('Internal server error');
    }
});

const checkReviewOwnership = async (userId, reviewId) => {
    try {
        const reviewSnapshot = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();
        const reviewData = reviewSnapshot.data();
        return userId === reviewData.userId;
    } catch (error) {
        console.error(error);
        return false;
    }
};

const updateBarberShopRating = async (barberShopId) => {
    try {
        const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barberShopId', '==', barberShopId)
            .get();
        let totalRating = 0;
        reviewsSnapshot.docs.forEach(doc => {
            const reviewData = doc.data();
            totalRating += Number(reviewData.rating);
        });
        let averageRating = totalRating / reviewsSnapshot.size;
        if (averageRating === 0 || isNaN(averageRating)) {
            averageRating = 5;
        }
        await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).update({totalRating: averageRating});
    } catch (error) {
        console.error('Error in updateBarberShopRating:', error);
    }
};
module.exports = router;