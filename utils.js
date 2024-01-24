const fs = require('fs');
const {appendFile, readdir} = require("fs");
const admin = require('firebase-admin');
const serviceAccount = require('./hairbook-45906-firebase-adminsdk-e1ys3-a4207ff8e3.json');
const {getFirestore} = require("firebase-admin/firestore");
const path = require("path");
const jwt = require('jsonwebtoken');
const moment = require("moment");
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
    const startTimestamp = new Date();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const queryParams = req.query;
    const headers = req.headers;
    const body = req.body;
    const logData = `[${startTimestamp.toLocaleTimeString()}] [Request] ${method} ${url}\nQuery Parameters: ${JSON.stringify(queryParams)}\nHeaders: ${JSON.stringify(headers)}\nRequest Body: ${JSON.stringify(body)}\n\n`;
    const originalSend = res.send;
    res.send = function (responseBody) {
        const endTimestamp = new Date();
        const timeTaken = endTimestamp - startTimestamp;
        const responseLogData = `\n[${endTimestamp.toLocaleTimeString()}] [Response] ${method} ${url}\nResponse Body: ${JSON.stringify(responseBody)}\nStatus: ${res.statusCode} \n\nTime taken: ${timeTaken}ms\n\n`;
        const logFileName = `combined_log_${startTimestamp.getTime()}.txt`; // Use the start timestamp for the log file name
        const logFilePath = path.join(__dirname, 'logs', logFileName);
        appendFile(logFilePath, logData + responseLogData, (err) => {
            if (err) {
                console.error('Error saving log to file:', err);
            }
        });

        originalSend.apply(res, arguments);
    };
    next();
};

const checkUserRole = (expectedRole) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(401).json('User role not available');
        }
        if (req.userRole === expectedRole) {
            next();
        } else {
            console.log('User role:', req.userRole);
            console.log('Expected role:', expectedRole);
            return res.status(403).json('Access forbidden. Insufficient role.');
        }
    };
};
const verifyAccessToken = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json('Access token not provided');
        }
        const token = authorizationHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json('Invalid access token format');
        }
        const isRevoked = await isTokenRevoked(token);
        if (isRevoked) {
            return res.status(401).json('Access token revoked. Please sign in again.');
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
            return res.status(401).json('User not found');
        }
    } catch (error) {
        console.error('Error in verifyAccessToken:', error);
        return res.status(401).json('Invalid access token');
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
            res.status(404).json(`${expectedRole} details not found`);
        }
    } catch (error) {
        console.error(`Error in get-${expectedRole}-details:`, error);
        res.status(500).json('Internal server error');
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
        res.status(400).json(`Cannot book or update to a past date ${requestedDate}`)
        return false;
    }

    const workingDayIndex = requestedDate.day();
    let requestedTime;
    const days = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
    const requestedDayHours = days[workingDayIndex];
    if (requestedDate.minutes() === 0) {
        requestedTime = `${requestedDate.hours()}:00`;
    } else {
        requestedTime = `${requestedDate.hours()}:${requestedDate.minutes()}`;
    }

    if (barbershopData.workingDays[workingDayIndex] !== 1 || !barbershopData[requestedDayHours].includes(requestedTime)) {
        res.status(400).json('The barbershop is closed at the requested date/hour', {
            day: workingDayIndex + 1,
            time: requestedTime
        });
        return false;
    }

    return true;
}

async function isBookingTimeAvailable(date, barbershopId, bookingId, res) {
    const requestedDate = moment(date, DATE_FORMAT);
    const existingBooking = await db.collection(BOOKING_COLLECTION)
        .where('barbershopId', '==', barbershopId)
        .where('date', '==', requestedDate.format(DATE_FORMAT))
        .get();
    if (!existingBooking.empty) {
        res.status(400).json('Another booking exists at the same time and date');
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
