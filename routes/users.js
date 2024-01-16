var express = require('express');
var router = express.Router();
const {firebaseAdmin, db} = require('../firebase-admin-init'); // Import the Firebase Admin SDK initialization
const BarberDTO = require('../entities/Barber')
const BookingDTO = require("../entities/Booking");
router.get('/allbarbers', async (req, res) => {
    try {
        // Use collectionGroup to query all 'barbers' subcollections
        const barbers = await db.collectionGroup('Barbers').get();

        // Initialize an array to store all barbers
        const allBarbers = [];
        // Iterate through each document in the query
        barbers.forEach( (barberDoc) => {
            // Get the data from the barber document
            const barberData = barberDoc.data();


            // // Create a new BarberShopDTO instance using the retrieved data
            // const barberDTO = new BarberDTO(
            //     barberData
            // );

            // Add the BarberShopDTO instance to the 'allBarbers' array
            allBarbers.push(barberData);
        });

        // Send the list of all barbers as a JSON response
        res.json({ allBarbers });
    } catch (error) {
        // Handle any errors that occur during the Firestore query
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/* GET users listing. */
//
// _user_id
router.get('/show_my_reviews', (req, res) => {

});
// _user_id _barbershop_id, first_name,last_name, date, review, rating
router.post('/postreview', (req, res) => {

});
// Review
router.put('/updatereview', (req, res) => {

});
// barbershop id, full name, date, review
router.delete('/deletereview', (req, res) => {

});


// id, full name, age
router.put('/updatemydetails', (req, res) => {

})

module.exports = router;
