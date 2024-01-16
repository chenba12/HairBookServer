const admin = require('firebase-admin');

const serviceAccount = require('./hairbook-45906-firebase-adminsdk-e1ys3-a4207ff8e3.json');
const {getFirestore} = require("firebase-admin/firestore");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();
module.exports = {admin, db};
