require('dotenv').config();
const express = require('express');
const router = express.Router();
const {isEmailUnique, verifyAccessToken, addToBlacklist} = require('../utils');
const jwt = require('jsonwebtoken');
const {db} = require('../utils');
const bcrypt = require("bcrypt");
const User = require("../entities/User");
const {USERS_COLLECTION} = require("../consts");


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

// Signup
router.post('/sign-up', async (req, res) => {
    try {
        const data = new User(req.body);
        const access_token = jwt.sign({email: data.email, role: data.role}, process.env.ACCESS_TOKEN_SECRET);
        data.password = await bcrypt.hash(data.password, 10);
        const emailExists = await isEmailUnique(data.email);
        if (emailExists) {
            const plainObject = {...data};
            const write_result = await db.collection(USERS_COLLECTION).doc().set(plainObject);
            res.json({user: data, access_token: access_token});
        } else {
            res.status(400).json("Email already exists."
            );
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