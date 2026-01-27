const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const admin = require('firebase-admin');

// Middleware to verify token (duplicated here for safety or import if possible)
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

// Helper: Get Live Status
const getLiveStatus = async (userId) => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    
    // Format current time HH:mm
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    try {
        const activeSlot = await Timetable.findOne({
            userId: userId,
            day: currentDay,
            startTime: { $lte: currentTime },
            endTime: { $gte: currentTime }
        });

        if (activeSlot) {
            return { state: 'busy', status: `In Class: ${activeSlot.title}`, endTime: activeSlot.endTime };
        }
        return { state: 'free', status: 'Free' };
    } catch (e) {
        return { state: 'unknown', status: 'Unknown' };
    }
};

// 1. Get My Friends (with Live Status)
router.get('/mine', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findOne({ firebaseUid: req.user.uid }).populate('friends');
        if (!currentUser) return res.status(404).send("User not found");

        const friendsWithStatus = await Promise.all(currentUser.friends.map(async (friend) => {
            const status = await getLiveStatus(friend._id);
            return {
                _id: friend._id,
                displayName: friend.displayName,
                photoURL: friend.photoURL,
                firebaseUid: friend.firebaseUid,
                branch: friend.branch,
                semester: friend.semester,
                liveStatus: status
            };
        }));

        res.json(friendsWithStatus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// 2. Search Peers (Not yet friends)
router.get('/search', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findOne({ firebaseUid: req.user.uid });
        const filter = { 
            university: currentUser.university,
            _id: { $ne: currentUser._id, $nin: currentUser.friends } // Exclude self and existing friends
        };
        
        const peers = await User.find(filter).select('displayName photoURL branch semester firebaseUid');
        
        // Check which ones have PENDING requests
        const peersWithStatus = peers.map(peer => {
            const hasSentRequest = peer.friendRequests?.some(r => r.from.toString() === currentUser._id.toString() && r.status === 'pending');
             // Also check if THEY sent ME a request (optional, but good UX)
             const hasReceivedRequest = currentUser.friendRequests?.some(r => r.from.toString() === peer._id.toString() && r.status === 'pending');

             let relation = 'none';
             if (hasSentRequest) relation = 'sent';
             if (hasReceivedRequest) relation = 'received';

             return { ...peer.toObject(), relation };
        });

        res.json(peersWithStatus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// 3. Send Friend Request
router.post('/request/:targetId', verifyToken, async (req, res) => {
    try {
        const sender = await User.findOne({ firebaseUid: req.user.uid });
        const target = await User.findById(req.params.targetId);

        if (!target) return res.status(404).send("User not found");
        
        // Check duplication
        const alreadyReq = target.friendRequests.find(r => r.from.toString() === sender._id.toString() && r.status === 'pending');
        if (alreadyReq) return res.status(400).send("Request already sent");

        target.friendRequests.push({ from: sender._id, status: 'pending' });
        await target.save();

        res.json({ message: "Request sent" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// 4. Accept/Reject Request
router.post('/respond', verifyToken, async (req, res) => {
    const { requestId, action } = req.body; // action: 'accept' | 'reject'
    try {
        const me = await User.findOne({ firebaseUid: req.user.uid });
        const reqItem = me.friendRequests.id(requestId);

        if (!reqItem) return res.status(404).json({error: "Request not found"});

        if (action === 'accept') {
            reqItem.status = 'accepted';
            me.friends.push(reqItem.from);
            
            // Add me to sender's friends too
            const sender = await User.findById(reqItem.from);
            sender.friends.push(me._id);
            await sender.save();
        } else {
            reqItem.status = 'rejected';
        }
        
        // Clean up processed request (or keep it as history? let's remove for now to keep array small)
        me.friendRequests.pull(requestId); // Remove from array

        await me.save();
        res.json({ message: `Request ${action}ed` });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// 5. Get Incoming Requests
router.get('/requests', verifyToken, async (req, res) => {
    try {
        const me = await User.findOne({ firebaseUid: req.user.uid }).populate('friendRequests.from', 'displayName photoURL firebaseUid');
        const pending = me.friendRequests.filter(r => r.status === 'pending');
        res.json(pending);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
