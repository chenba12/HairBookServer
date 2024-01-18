const fs = require('fs');
const {appendFile, readdir} = require("fs");
const admin = require('firebase-admin');
const serviceAccount = require('./hairbook-45906-firebase-adminsdk-e1ys3-a4207ff8e3.json');
const {getFirestore} = require("firebase-admin/firestore");
const path = require("path");
const jwt = require('jsonwebtoken');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();


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

    // Save request and response log to the same file with timestamp
    const logData = `[${startTimestamp.toLocaleTimeString()}] [Request] ${method} ${url}\nQuery Parameters: ${JSON.stringify(queryParams)}\nHeaders: ${JSON.stringify(headers)}\nRequest Body: ${JSON.stringify(body)}\n\n`;

    // Override res.send to capture response data
    const originalSend = res.send;
    res.send = function (responseBody) {
        // Log response details to the console
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

const {getAuth} = require("firebase-admin/auth");

const verifyAccessToken = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({error: 'Access token not provided'});
        }
        // Verify the access token
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        // Retrieve the user from the database based on the decoded information (e.g., email)
        const userSnapshot = await db.collection('Users').where('email', '==', decoded.email).get();
        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            // Attach user role to the request for use in subsequent middleware or route handlers
            req.userRole = user.role;
            // Continue to the next middleware or route handler
            next();
        } else {
            return res.status(401).json({error: 'User not found'});
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(401).json({error: 'Invalid access token'});
    }
};

async function isEmailUnique(email) {
    const querySnapshot = await db.collection('Users').where('email', '==', email).get();
    console.log('Query Snapshot:', querySnapshot.docs.map(doc => doc.data()));
    return querySnapshot.empty;
}

module.exports = {admin, db, deleteLogFile, customLogger, verifyAccessToken};
