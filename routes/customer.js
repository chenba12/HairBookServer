const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole, getUserDetails} = require('../utils');
const Message = require("../entities/Message");
const User = require("../entities/User");
const {BARBERSHOPS_COLLECTION, USERS_COLLECTION} = require("../consts");
const CustomerDTO = require("../entities/Customer");

router.get('/get-all-shops', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const barberShops = await db.collectionGroup(BARBERSHOPS_COLLECTION).get();
        const allBarberShops = [];
        barberShops.forEach((barberDoc) => {
            const barberShopData = barberDoc.data();
            barberShopData._barbershop_id = barberDoc.id;
            allBarberShops.push(barberShopData);
        });
        res.status(200).json(new Message('All barber shops retrieved successfully', allBarberShops, 1));
    } catch (error) {
        console.error(error);
        res.status(500).json(new Message('Internal Server Error', null, 0));
    }
});


router.get('/get-customer-details', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(new Message('Customer details retrieved successfully', req.userDetails, 1));
    }, 'Customer');
});


module.exports = router;
