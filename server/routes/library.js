const express = require('express');
const router = express.Router();
const LibraryItem = require('../models/LibraryItem');
const User = require('../models/User'); // We need this to get user's university

// Middleware to verify token (Assuming you have one, or we replicate the logic)
// Since we are in a rush and using the same pattern as other routes:
const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).send('Unauthorized');
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(403).send('Invalid Token');
    }
};

// GET / - Get all items for my university
router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Find the user in our DB to know their university
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) {
            return res.status(400).json({ error: "University profile not found" });
        }

        // 2. Filter options
        const query = { university: user.university };
        if (req.query.category && req.query.category !== 'All') {
            query.category = req.query.category;
        }

        const items = await LibraryItem.find(query).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error("Library Fetch Error:", error);
        res.status(500).send("Server Error");
    }
});

// POST / - Upload new item
router.post('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) {
            return res.status(400).json({ error: "Complete your profile first" });
        }

        const newItem = new LibraryItem({
            userId: req.user.uid,
            university: user.university,
            uploadedBy: user.displayName || 'Anonymous',
            ...req.body // title, category, link, description
        });

        await newItem.save();
        res.json(newItem);
    } catch (error) {
        console.error("Library Upload Error:", error);
        res.status(500).send("Server Error");
    }
});

// DELETE /:id - Delete my item
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const item = await LibraryItem.findById(req.params.id);
        if (!item) return res.status(404).send("Not found");
        
        if (item.userId !== req.user.uid) {
            return res.status(403).send("Not authorized");
        }

        await LibraryItem.findByIdAndDelete(req.params.id);
        res.json({ msg: "Deleted" });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
