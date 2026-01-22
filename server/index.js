const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to protect routes
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"
    if (!token) return res.status(401).send("Unauthorized");
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Add user info to request
        next();
    } catch (error) {
        res.status(401).send("Invalid Token");
    }
};

// Basic Route
app.get('/', (req, res) => {
    res.send('Hello from the Server!');
});

// Example Protected Route
app.get('/protected-data', verifyToken, (req, res) => {
    res.send(`Hello ${req.user.email}, this data is secret!`);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

