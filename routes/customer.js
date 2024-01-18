const express = require('express');
const router = express.Router();
const {db, verifyAccessToken} = require('../utils');

router.get('/', verifyAccessToken, (req, res) => {
    // Handle customer route
    res.json({ message: 'Access granted', userRole: req.userRole });
});
router.get('/allbarbers', async (req, res) => {
    try {
        // Use collectionGroup to query all 'barbers' subcollections
        const barbers = await db.collectionGroup('Barbers').get();

        // Initialize an array to store all barbers
        const allBarbers = [];
        // Iterate through each document in the query
        barbers.forEach((barberDoc) => {
            // Get the data from the barber document
            const barberData = barberDoc.data();
            // Add the BarberShopDTO instance to the 'allBarbers' array
            allBarbers.push(barberData);
        });

        // Send the list of all barbers as a JSON response
        res.json({allBarbers});
    } catch (error) {
        // Handle any errors that occur during the Firestore query
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

module.exports = router;
