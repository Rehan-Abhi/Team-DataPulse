const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
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

// GET /mine - List my conversations
router.get('/mine', verifyToken, async (req, res) => {
    try {
        const uid = req.user.uid;
        // Find conversations where user is a participant
        const convs = await Conversation.find({ participants: uid })
            .sort({ lastMessageAt: -1 }) // Most recent first
            .populate('relatedItemId', 'title');
            
        // Enhanced info (names of OTHER participant)
        // This is a bit expensive but good for MVP
        res.json(convs);
    } catch (error) {
        console.error("Fetch items error:", error);
        res.status(500).send("Server Error");
    }
});

// POST /start - Start or Get Chat with User
router.post('/start', verifyToken, async (req, res) => {
    try {
        const { targetUid, relatedItemId } = req.body;
        const myUid = req.user.uid;

        if (targetUid === myUid) return res.status(400).json({ error: "Cannot chat with yourself" });

        // Check if conversation exists
        let conv = await Conversation.findOne({
            participants: { $all: [myUid, targetUid] },
            relatedItemId: relatedItemId || null // Optional: separate chats per item? For simple MVP, maybe just ONE chat per pair
        });

        // If strict per-item chat desired:
        if (!conv) {
             conv = await Conversation.findOne({
                participants: { $all: [myUid, targetUid] }
            });
        }
        
        if (!conv) {
            conv = new Conversation({
                participants: [myUid, targetUid],
                relatedItemId: relatedItemId || null,
                messages: []
            });
            await conv.save();
        }

        res.json(conv);
    } catch (error) {
        console.error("Start Chat Error:", error);
        res.status(500).send("Server Error");
    }
});

// GET /:id - Get Messages
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).send("Not found");
        
        if (!conv.participants.includes(req.user.uid)) return res.status(403).send("Unauthorized");

        res.json(conv);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// POST /:id/message - Send Message
router.post('/:id/message', verifyToken, async (req, res) => {
    try {
        const { text } = req.body;
        const conv = await Conversation.findById(req.params.id);
        if (!conv) return res.status(404).send("Not found");
        
        // Simple User Name fetch (could be optimized)
        const user = await User.findOne({ firebaseUid: req.user.uid });

        const newMessage = {
            senderId: req.user.uid,
            senderName: user ? user.displayName : 'User',
            text,
            createdAt: new Date()
        };

        conv.messages.push(newMessage);
        conv.lastMessageAt = new Date();
        await conv.save();

        res.json(newMessage);
    } catch (error) {
        console.error("Send Msg Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
