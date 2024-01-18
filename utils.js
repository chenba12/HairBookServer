const fs = require('fs');
const {appendFile, readdir} = require("fs");
const admin = require('firebase-admin');
const serviceAccount = require('./hairbook-45906-firebase-adminsdk-e1ys3-a4207ff8e3.json');
const {getFirestore} = require("firebase-admin/firestore");
const path = require("path");
const jwt = require('jsonwebtoken');
const moment = require("moment");
const Message = require("./entities/Message");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();
const revokedTokensCollection = db.collection('revokedTokens');

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
        const userSnapshot = await db.collection('Users').where('email', '==', decoded.email).get();
        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            req.userRole = user.role;
            req.userEmail = user.email;
            req.userToken = token;
            req.userId = userSnapshot.docs[0].id;
            checkUserRole('Customer')(req, res, next);
        } else {
            return res.status(401).json(new Message('User not found', null, 0));
        }
    } catch (error) {
        console.error('Error in verifyAccessToken:', error);
        return res.status(401).json(new Message('Invalid access token', null, 0));
    }
}

async function isEmailUnique(email) {
    const querySnapshot = await db.collection('Users').where('email', '==', email).get();
    console.log('Query Snapshot:', querySnapshot.docs.map(doc => doc.data()));
    return querySnapshot.empty;
}

function isDatePastCertainDate(currentDateStr, bookingDateStr) {
    const currentDate = moment(currentDateStr, 'DD-MM-YYYY HH:mm');
    const bookingDate = moment(bookingDateStr, 'DD-MM-YYYY HH:mm');

    return currentDate.isBefore(bookingDate);
}

function extractHoursAndMinutes(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return {hours, minutes};
}

function extractDayMonthYear(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return {day, month, year};
}


const addToBlacklist = async (token) => {
    await revokedTokensCollection.doc(token).set({ revoked: true });
};

// Function to check if a token is in the blacklist
const isTokenRevoked = async (token) => {
    const snapshot = await revokedTokensCollection.doc(token).get();
    return snapshot.exists;
};

module.exports = {
    admin,
    db,
    deleteLogFile,
    customLogger,
    verifyAccessToken,
    isEmailUnique,
    isDatePastCertainDate,
    extractHoursAndMinutes,
    extractDayMonthYear,
    checkUserRole,
    addToBlacklist,
    isTokenRevoked,
};
