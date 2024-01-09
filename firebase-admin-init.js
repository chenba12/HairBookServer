const admin = require('firebase-admin');

const serviceAccount = require('C:\\Users\\kabal\\WebstormProjects\\HairBookServer\\hairbook-45906-firebase-adminsdk-e1ys3-fd034e16df.json');
const {getFirestore} = require("firebase-admin/firestore");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    //databaseURL: 'https://your-project-id.firebaseio.com' // Replace with your database URL
});
const db = getFirestore();
module.exports = {admin,db};
