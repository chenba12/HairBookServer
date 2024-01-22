const express = require('express');
const router = express.Router();
const {db, verifyAccessToken, checkUserRole, getUserDetails} = require('../utils');
const User = require("../entities/User");
const {BARBERSHOPS_COLLECTION, USERS_COLLECTION, SERVICES_COLLECTION} = require("../consts");
const CustomerDTO = require("../entities/Customer");

router.get('/get-all-shops', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    try {
        const barberShops = await db.collectionGroup(BARBERSHOPS_COLLECTION).get();
        const allBarberShops = [];
        barberShops.forEach((barberDoc) => {
            const barberShopData = barberDoc.data();
            barberShopData.barbershopId = barberDoc.id;
            allBarberShops.push(barberShopData);
        });
        res.status(200).json(allBarberShops);
    } catch (error) {
        console.error(error);
        res.status(500).json('Internal Server Error');
    }
});
router.get('/get-services', verifyAccessToken, checkUserRole('Barber'), async (req, res) => {
    try {
        const barbershopId = req.query.barbershopId;

        const servicesSnapshot = await db.collection(SERVICES_COLLECTION)
            .where('barbershopId', '==', barbershopId)
            .get();

        const services = servicesSnapshot.docs.map(doc => {
            const serviceData = doc.data();
            return {serviceId: doc.id, ...serviceData};
        });

        return res.status(200).json(services);
    } catch (error) {
        console.error('Error in get-services:', error);
        return res.status(500).json('Internal server error');
    }
});

router.get('/get-customer-details', verifyAccessToken, checkUserRole('Customer'), async (req, res) => {
    await getUserDetails(req, res, () => {
        res.status(200).json(req.userDetails);
    }, 'Customer');
});


module.exports = router;
