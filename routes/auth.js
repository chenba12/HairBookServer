require('dotenv').config();
const express = require('express');
const router = express.Router();
const {isEmailUnique, verifyAccessToken} = require('../utils');
const jwt = require('jsonwebtoken');
const {db, admin} = require('../utils');
const {getAuth} = require("firebase-admin/auth");
const bcrypt = require("bcrypt");
const User = require("../entities/User");
const Message = require("../entities/Message");

const blacklist = new Set();
router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;
        const userSnapshot = await db.collection('Users').where("email", "==", email).get();

        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            const hashedPassword = user.password;
            // Compare the provided password with the hashed password from the database
            const passwordMatch = await bcrypt.compare(password, hashedPassword);
            if (passwordMatch) {
                const accessToken = jwt.sign({email: user.email, role: user.role}, process.env.ACCESS_TOKEN_SECRET);
                res.json(new Message("Authentication successfully", {user: user, accessToken: accessToken}, 1));
            } else {
                res.status(401).json(new Message("Authentication failed. Invalid email or password.", null, 0));
            }
        } else {
            res.status(401).json(new Message("Authentication failed. Invalid email or password.", null, 0));
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json(new Message("Internal server error.", null, 0));
    }
});

// Signup
router.post('/signup', async (req, res) => {
    try {
        const data = new User(req.body);
        const access_token = jwt.sign({email: data.email, role: data.role}, process.env.ACCESS_TOKEN_SECRET);
        data.password = await bcrypt.hash(data.password, 10);
        // Check if the email is unique before creating the user
        const emailExists = await isEmailUnique(data.email);
        if (emailExists) {
            const plainObject = {...data};
            const write_result = await db.collection('Users').doc().set(plainObject);
            res.json({user: data, access_token: access_token});
        } else {
            res.status(400).json(new Message("Email already exists.", null, 0)
            );
        }
    } catch (error) {
        console.log(error);
        res.status(500).json(new Message("Internal server error.", null, 0));
    }
});

router.post('/signout', verifyAccessToken, (req, res) => {
    blacklist.add(token);
    res.json(new Message("Successfully signed out.", null, 1));
});


module.exports = router;