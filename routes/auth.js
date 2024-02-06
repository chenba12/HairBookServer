require('dotenv').config();
const express = require('express');
const router = express.Router();
const {isEmailUnique, verifyAccessToken, addToBlacklist, checkUserRole} = require('../utils');
const jwt = require('jsonwebtoken');
const {db} = require('../utils');
const bcrypt = require("bcrypt");
const User = require("../entities/User");
const {
    USERS_COLLECTION,
    BARBERSHOPS_COLLECTION,
    BARBER_DETAILS_COLLECTION,
    CUSTOMER_DETAILS_COLLECTION
} = require("../consts");
const BarberDTO = require("../entities/Barber");
const CustomerDTO = require("../entities/Customer");

router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;
        const userSnapshot = await db.collection(USERS_COLLECTION).where("email", "==", email).get();
        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            const hashedPassword = user.password;
            const passwordMatch = await bcrypt.compare(password, hashedPassword);
            if (passwordMatch) {
                const accessToken = jwt.sign({email: user.email, role: user.role}, process.env.ACCESS_TOKEN_SECRET);
                const fullUser = {...user, userId: userSnapshot.docs[0].id, accessToken: accessToken};
                res.json({...fullUser,});
            } else {
                res.status(401).json("Authentication failed. Invalid email or password.");
            }
        } else {
            res.status(401).json("Authentication failed. Invalid email or password.");
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json("Internal server error.");
    }
});

router.get('/get-details', verifyAccessToken, async (req, res) => {
    try {
        const userId = req.userId;
        const role = req.userRole
        console.log(userId, role)
        let userSnapshot;
        if (role === 'Barber') {
            userSnapshot = await db.collection(BARBER_DETAILS_COLLECTION).doc(userId).get();
            if (!userSnapshot.empty) {
                res.json({...userSnapshot.data(),});
            }
        } else if (role === 'Customer') {
            userSnapshot = await db.collection(CUSTOMER_DETAILS_COLLECTION).doc(userId).get();
            if (!userSnapshot.empty) {
                res.json({...userSnapshot.data(),});
            }
        } else {
            res.status(401).json("Something went wrong.");
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json("Internal server error.");
    }
});
// Signup
router.post('/sign-up', async (req, res) => {
    try {
        const {details, ...userWithoutDetails} = req.body;
        const data = new User(userWithoutDetails);
        let detailsObject;
        let detailsCollection;
        if (req.body.role === 'Barber') {
            detailsObject = new BarberDTO(details);
            detailsCollection = 'BarberDetails';
        } else if (req.body.role === 'Customer') {
            detailsObject = new CustomerDTO(details);
            detailsCollection = 'CustomerDetails';
        }
        const accessToken = jwt.sign({email: data.email, role: data.role}, process.env.ACCESS_TOKEN_SECRET);
        data.password = await bcrypt.hash(data.password, 10);
        const emailExists = await isEmailUnique(data.email);
        if (emailExists) {
            const userDocRef = await (await db.collection(USERS_COLLECTION).add({...data})).get();
            await db.collection(detailsCollection).doc(userDocRef.id).set({...detailsObject});
            res.json({userId:userDocRef.id,...data, accessToken});
        } else {
            res.status(400).json("Email already exists.");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json("Internal server error.");
    }
});

router.post('/sign-out', verifyAccessToken, async (req, res) => {
    await addToBlacklist(req.userToken);
    res.json('Successfully signed out.')
});


module.exports = router;