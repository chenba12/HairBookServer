const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole} = require('../utils');
const Message = require("../entities/Message");

//Test for access token and role checking
router.get('/', verifyAccessToken, checkUserRole('Customer'), (req, res) => {
    res.json(new Message('Access granted. User has the correct role.', null, 1));
});
router.get('/getAllShops', async (req, res) => {
    try {
        const barberShops = await db.collectionGroup('BarberShops').get();
        const allBarberShops = [];
        barberShops.forEach((barberDoc) => {
            const barberShopData = barberDoc.data();
            allBarberShops.push(barberShopData);
        });
        res.json({allBarberShops});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

module.exports = router;
