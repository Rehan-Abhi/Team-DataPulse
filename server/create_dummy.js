const admin = require('firebase-admin');
const mongoose = require('mongoose');
const serviceAccount = require('./serviceAccountKey.json');
require('dotenv').config();
const User = require('./models/User');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const createDummy = async () => {
    try {
        console.log("Loading .env...");
        require('dotenv').config();
        
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("ERROR: MONGODB_URI is undefined. Check .env file.");
            process.exit(1);
        }
        
        console.log("Connecting to MongoDB...", uri.substring(0, 15) + "...");
        await mongoose.connect(uri);
        console.log("Connected.");

        const email = 'dummy@test.com';
        const password = 'password123';
        const displayName = 'Dummy Student';
        const university = 'Punjab Engineering College'; // Matching your college

        console.log(`Creating Firebase User: ${email}...`);
        
        let uid;
        try {
            const userRecord = await admin.auth().createUser({
                email,
                password,
                displayName
            });
            uid = userRecord.uid;
            console.log("Firebase User Created:", uid);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log("User already exists in Firebase, fetching UID...");
                const user = await admin.auth().getUserByEmail(email);
                uid = user.uid;
            } else {
                throw error;
            }
        }

        console.log("Creating/Updating MongoDB User Document...");
        const userDoc = await User.findOneAndUpdate(
            { firebaseUid: uid },
            {
                firebaseUid: uid,
                email,
                displayName,
                university,
                branch: 'CSE',
                semester: 4,
                isProfileComplete: true,
                photoURL: 'https://ui-avatars.com/api/?name=Dummy+Student&background=random'
            },
            { upsert: true, new: true }
        );

        console.log("Dummy User Ready!");
        console.log("-------------------------------------------------");
        console.log("Email:    " + email);
        console.log("Password: " + password);
        console.log("College:  " + university);
        console.log("-------------------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("Error creating dummy user:", error);
        process.exit(1);
    }
};

createDummy();
