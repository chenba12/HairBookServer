const express = require('express');
const {verifyAccessToken, checkUserRole, db} = require("../utils");
const {BARBERSHOPS_COLLECTION, REVIEWS_COLLECTION} = require("../consts");
const router = express.Router();

router.get('/get-shop_by_id', verifyAccessToken, checkUserRole(['Customer','Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const barberShopSnapshot = await db.collection(BARBERSHOPS_COLLECTION).doc(barberShopId).get();
        if (barberShopSnapshot.exists) {
            const barberShopData = barberShopSnapshot.data();
            barberShopData.barberShopId = barberShopSnapshot.id;
            res.status(200).json(barberShopData);
        } else {
            res.status(404).json('Barber shop not found');
        }
    } catch (error) {
        console.error('Error in get-shop_by_id:', error);
        res.status(500).json('Internal server error');
    }
});

router.get('/get-reviews', verifyAccessToken, checkUserRole(['Customer','Barber']), async (req, res) => {
    try {
        const barberShopId = req.query.barberShopId;
        const userReviewsSnapshot = await db.collection(REVIEWS_COLLECTION)
            .where('barberShopId', '==', barberShopId)
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

module.exports = router;