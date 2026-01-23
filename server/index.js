const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
const mongoose = require('mongoose');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Attendance = require('./models/Attendance');

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

mongoose.connect(process.env.MONGODB_URI, clientOptions)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

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

// Sync User Endpoint
app.post('/api/users/sync', verifyToken, async (req, res) => {
    const { uid, email, name, picture } = req.user;
    try {
        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            {
                email,
                displayName: name || '',
                photoURL: picture || ''
            },
            { new: true, upsert: true } // Create if not exists, return new doc
        );
        res.status(200).json(user);
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).send('Server Error');
    }
});

// Get User Profile
app.get('/api/users/profile', verifyToken, async (req, res) => {
    const { uid } = req.user;
    try {
        const user = await User.findOne({ firebaseUid: uid });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Server Error');
    }
});

// Update User Profile
app.put('/api/users/profile', verifyToken, async (req, res) => {
    const { university, branch, semester } = req.body;
    const { uid } = req.user;

    try {
        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { 
                university, 
                branch, 
                semester,
                semester,
                isProfileComplete: true,
                // Ensure email and firebaseUid are set if creating new doc
                email: req.user.email,
                displayName: req.user.name || '',
                photoURL: req.user.picture || ''
            },
            { new: true, upsert: true }
        );
        res.status(200).json(user);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Server Error');
    }
});

// --- TIMETABLE ROUTES ---

// Get User's Timetable
app.get('/api/timetable', verifyToken, async (req, res) => {
    try {
        console.log("Fetching timetable for firebaseUid:", req.user.uid);
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            console.log("User not found for timetable fetch");
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Found user _id:", user._id);
        const userSlots = await Timetable.find({ userId: user._id }).sort({ startTime: 1 });
        console.log("Found slots:", userSlots.length);
        
        res.status(200).json(userSlots);
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).send('Server Error');
    }
});

// Add Timetable Slot
app.post('/api/timetable', verifyToken, async (req, res) => {
    const { day, startTime, endTime, title, location, type } = req.body;
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        const newSlot = new Timetable({
            userId: user._id, 
            day, startTime, endTime, title, location, type
        });
        await newSlot.save();
        res.status(201).json(newSlot);
    } catch (error) {
        console.error('Error creating slot:', error);
        res.status(500).send('Server Error');
    }
});

// Delete Timetable Slot
app.delete('/api/timetable/:id', verifyToken, async (req, res) => {
    try {
        // Need to ensure the slot belongs to the user
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const slot = await Timetable.findOne({ _id: req.params.id, userId: user._id });
        
        if (!slot) return res.status(404).json({ message: "Slot not found" });
        
        await Timetable.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: "Slot deleted" });
    } catch (error) {
        console.error('Error deleting slot:', error);
        res.status(500).send('Server Error');
    }
});


// --- ATTENDANCE ROUTES ---

// Mark Attendance
app.post('/api/attendance', verifyToken, async (req, res) => {
    const { timetableId, date, status } = req.body; // date format YYYY-MM-DD
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        
        const record = await Attendance.findOneAndUpdate(
            { userId: user._id, timetableId, date },
            { status },
            { new: true, upsert: true } // Update if exists (e.g. changing Present to Absent), Create if not
        );
        res.status(200).json(record);
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).send('Server Error');
    }
});

// Get Attendance History (for a date range or all)
app.get('/api/attendance', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        // Optional: filter by query param ?date=YYYY-MM-DD
        const filter = { userId: user._id };
        if (req.query.date) {
            filter.date = req.query.date;
        }
        
        const history = await Attendance.find(filter);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).send('Server Error');
    }
});

// Example Protected Route
app.get('/protected-data', verifyToken, (req, res) => {
    res.send(`Hello ${req.user.email}, this data is secret!`);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

