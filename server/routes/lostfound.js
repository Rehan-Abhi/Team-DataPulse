const express = require('express');
const router = express.Router();
const LostItem = require('../models/LostItem');
const User = require('../models/User');
const admin = require('firebase-admin');

// Middleware
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

// GET / - Fetch items for university
router.get('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) return res.status(400).json({ error: "No university found" });

        const items = await LostItem.find({ university: user.university, status: 'Open' }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// POST / - Report item
router.post('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) return res.status(400).json({ error: "Complete profile first" });

        const newItem = new LostItem({
            university: user.university,
            ...req.body,
            finder: {
                name: user.displayName || 'Anonymous',
                uid: req.user.uid
            }
        });

        await newItem.save();
        res.json(newItem);
    } catch (error) {
        console.error("Report Item Error:", error);
        res.status(500).send("Server Error");
    }
});

// PUT /:id/resolve - Mark resolved
router.put('/:id/resolve', verifyToken, async (req, res) => {
    try {
        const item = await LostItem.findById(req.params.id);
        if (!item) return res.status(404).send("Not found");
        
        if (item.finder.uid !== req.user.uid) return res.status(403).send("Unauthorized");

        item.status = 'Resolved';
        await item.save();
        res.json(item);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
