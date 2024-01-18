require('dotenv').config();
const express = require('express');
const router = express.Router();
const {isEmailUnique} = require('../utils');
const jwt = require('jsonwebtoken');
const {db, admin} = require('../utils');
const {getAuth} = require("firebase-admin/auth");
const bcrypt = require("bcrypt");
const User = require("../entities/User");
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

                res.json({user: user, accessToken: accessToken});
            } else {
                // Passwords do not match, authentication failed
                res.status(401).json({error: 'Authentication failed. Invalid email or password.'});
            }
        } else {
            res.status(401).json({error: 'Authentication failed. Invalid email or password.'});
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({error: 'Internal server error'});
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
            res.status(400).json({error: 'Email already exists'});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Internal server error'});
    }
});


module.exports = router;