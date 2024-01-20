const fs = require('fs');
const {appendFile, readdir} = require("fs");
const admin = require('firebase-admin');
const serviceAccount = require('./hairbook-45906-firebase-adminsdk-e1ys3-a4207ff8e3.json');
const {getFirestore} = require("firebase-admin/firestore");
const path = require("path");
const jwt = require('jsonwebtoken');
const moment = require("moment");
const Message = require("./entities/Message");
const {DATE_FORMAT, BOOKING_COLLECTION, REVOKED_TOKENS_COLLECTION, USERS_COLLECTION} = require("./consts");
const User = require("./entities/User");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();
const revokedTokensCollection = db.collection(REVOKED_TOKENS_COLLECTION);

// Function to delete the log file
const deleteLogFile = (filePath) => {

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting log file:', err);
        } else {
            console.log('Log file deleted:', filePath);
        }
    });
};

const customLogger = (req, res, next) => {
    // Get request details
    const startTimestamp = new Date();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const queryParams = req.query;
    const headers = req.headers;
    const body = req.body;
    const logData = `[${startTimestamp.toLocaleTimeString()}] [Request] ${method} ${url}\nQuery Parameters: ${JSON.stringify(queryParams)}\nHeaders: ${JSON.stringify(headers)}\nRequest Body: ${JSON.stringify(body)}\n\n`;

    // Override res.send to capture response data
    const originalSend = res.send;
    res.send = function (responseBody) {
        const endTimestamp = new Date();
        const timeTaken = endTimestamp - startTimestamp;

        // Append response log to the existing log file
        const responseLogData = `\n[${endTimestamp.toLocaleTimeString()}] [Response] ${method} ${url}\nResponse Body: ${JSON.stringify(responseBody)}\nStatus: ${res.statusCode} \n\nTime taken: ${timeTaken}ms\n\n`;
        const logFileName = `combined_log_${startTimestamp.getTime()}.txt`; // Use the start timestamp for the log file name

        // Save the combined log to a file
        const logFilePath = path.join(__dirname, 'logs', logFileName);
        appendFile(logFilePath, logData + responseLogData, (err) => {
            if (err) {
                console.error('Error saving log to file:', err);
            }
        });

        // Call the original res.send
        originalSend.apply(res, arguments);
    };

    // Continue to the next middleware
    next();
};

const checkUserRole = (expectedRole) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(401).json(new Message('User role not available', null, 0));
        }
        if (req.userRole === expectedRole) {
            next();
        } else {
            console.log('User role:', req.userRole);
            console.log('Expected role:', expectedRole);
            return res.status(403).json(new Message('Access forbidden. Insufficient role.', null, 0));
        }
    };
};
const verifyAccessToken = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json(new Message('Access token not provided', null, 0));
        }
        const token = authorizationHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json(new Message('Invalid access token format', null, 0));
        }
        const isRevoked = await isTokenRevoked(token);
        if (isRevoked) {
            return res.status(401).json(new Message('Access token revoked. Please sign in again.', null, 0));
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userSnapshot = await db.collection(USERS_COLLECTION).where('email', '==', decoded.email).get();
        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            req.userRole = user.role;
            req.userEmail = user.email;
            req.userToken = token;
            req.userId = userSnapshot.docs[0].id;
            checkUserRole(user.role)(req, res, next);
        } else {
            return res.status(401).json(new Message('User not found', null, 0));
        }
    } catch (error) {
        console.error('Error in verifyAccessToken:', error);
        return res.status(401).json(new Message('Invalid access token', null, 0));
    }
}

const getUserDetails = async (req, res, next, expectedRole) => {
    try {
        const userSnapshot = await db.collection(USERS_COLLECTION).doc(req.userId).get();
        if (userSnapshot.exists) {
            const userDetails = new User(userSnapshot.data());
            userDetails.userId = req.userId;
            req.userDetails = userDetails;
            next();
        } else {
            res.status(404).json(new Message(`${expectedRole} details not found`, null, 0));
        }
    } catch (error) {
        console.error(`Error in get-${expectedRole}-details:`, error);
        res.status(500).json(new Message('Internal server error', null, 0));
    }
};

async function isEmailUnique(email) {
    const querySnapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).get();
    console.log('Query Snapshot:', querySnapshot.docs.map(doc => doc.data()));
    return querySnapshot.empty;
}

const addToBlacklist = async (token) => {
    await revokedTokensCollection.doc(token).set({revoked: true});
};

// Function to check if a token is in the blacklist
const isTokenRevoked = async (token) => {
    const snapshot = await revokedTokensCollection.doc(token).get();
    return snapshot.exists;
};

async function isBookingDateValid(date, barbershopData, res) {
    const currentDate = moment();
    const requestedDate = moment(date, DATE_FORMAT);

    if (requestedDate.isBefore(currentDate)) {
        res.status(400).json(new Message('Cannot book or update to a past date', requestedDate, 0));
        return false;
    }

    const workingDayIndex = requestedDate.day();
    let requestedTime;

    if (requestedDate.minutes() === 0) {
        requestedTime = `${requestedDate.hours()}:00`;
    } else {
        requestedTime = `${requestedDate.hours()}:${requestedDate.minutes()}`;
    }

    if (
        barbershopData.working_days[workingDayIndex] !== 1 ||
        !barbershopData.thursday_hours.includes(requestedTime)
    ) {
        res.status(400).json(new Message('The barbershop is closed at the requested date/hour', {
            day: workingDayIndex + 1,
            time: requestedTime
        }, 0));
        return false;
    }

    return true;
}

async function isBookingTimeAvailable(date, barbershopId, bookingId, res) {
    const requestedDate = moment(date, DATE_FORMAT);
    const existingBooking = await db.collection(BOOKING_COLLECTION)
        .where('_barbershop_id', '==', barbershopId)
        .where('date', '==', requestedDate.format(DATE_FORMAT))
        .get();
    if (!existingBooking.empty) {
        res.status(400).json(new Message('Another booking exists at the same time and date', null, 0));
        return false;
    }

    return true;
}

module.exports = {
    admin,
    db,
    deleteLogFile,
    customLogger,
    verifyAccessToken,
    isEmailUnique,
    checkUserRole,
    addToBlacklist,
    isTokenRevoked,
    isBookingDateValid,
    isBookingTimeAvailable,
    getUserDetails
};
