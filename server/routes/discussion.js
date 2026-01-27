const express = require('express');
const router = express.Router();
const DiscussionPost = require('../models/DiscussionPost');
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

// GET / - Fetch posts for my university
router.get('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) return res.status(400).json({ error: "No university found in profile" });

        const { type } = req.query;
        const query = { university: user.university };
        if (type && type !== 'All') {
            query.type = type;
        }

        // Sort by Newest first
        const posts = await DiscussionPost.find(query).sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error("Fetch Posts Error:", error);
        res.status(500).send("Server Error");
    }
});

// POST / - Create a new post
router.post('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user || !user.university) return res.status(400).json({ error: "Complete your profile first" });

        const { type, title, content } = req.body;
        
        const newPost = new DiscussionPost({
            university: user.university,
            type,
            title,
            content,
            author: {
                name: user.displayName || 'Anonymous',
                uid: req.user.uid
            },
            upvotes: [],
            comments: []
        });

        await newPost.save();
        res.json(newPost);
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).send("Server Error");
    }
});

// PUT /:id/upvote - Toggle upvote
router.put('/:id/upvote', verifyToken, async (req, res) => {
    try {
        const post = await DiscussionPost.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");

        const uid = req.user.uid;
        const index = post.upvotes.indexOf(uid);

        if (index === -1) {
            // Add upvote
            post.upvotes.push(uid);
        } else {
            // Remove upvote
            post.upvotes.splice(index, 1);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        console.error("Upvote Error:", error);
        res.status(500).send("Server Error");
    }
});

// POST /:id/comment - Add comment
router.post('/:id/comment', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const { content } = req.body;
        
        const post = await DiscussionPost.findById(req.params.id);
        if (!post) return res.status(404).send("Post not found");

        post.comments.push({
            author: { 
                name: user.displayName || 'Anonymous', 
                uid: req.user.uid 
            },
            content,
            createdAt: new Date()
        });

        await post.save();
        res.json(post);
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
