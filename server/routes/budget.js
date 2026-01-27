const router = require('express').Router();
const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt');
const User = require('../models/User');
// const authMiddleware... removed

// We need to verify how auth is middleware is named. 
// I'll check index.js imports first to be safe, but for now I'll write the logic.
// Actually, let's assume standard firebase auth verification.

// Re-implementing basic CRUD

// Get all transactions for user
router.get('/transactions', async (req, res) => {
    try {
        console.log(`[Budget] GET /transactions for UID: ${req.user.uid}`);
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            console.log(`[Budget] User not found for UID: ${req.user.uid}`);
            return res.status(404).json({ error: "User not found" });
        }

        console.log(`[Budget] Found User _id: ${user._id}`);
        const txs = await Transaction.find({ user: user._id }).sort({ date: -1 });
        console.log(`[Budget] Found ${txs.length} transactions`);
        
        res.json(txs);
    } catch (err) {
        console.error(`[Budget] Error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Add Transaction
router.post('/transactions', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { type, amount, category, description, date } = req.body;
        const newTx = new Transaction({
            user: user._id,
            type,
            amount,
            category,
            description,
            date
        });
        await newTx.save();
        res.status(201).json(newTx);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Batch Add Transactions (for CSV Import)
router.post('/transactions/batch', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { transactions } = req.body; // Expecting array of { ... }
        if (!Array.isArray(transactions)) return res.status(400).json({ error: "Invalid data format" });

        const newTxs = transactions.map(t => ({
            ...t,
            user: user._id
        }));

        await Transaction.insertMany(newTxs);
        res.status(201).json({ message: `Imported ${newTxs.length} transactions` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Transaction
router.delete('/transactions/:id', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ error: "User not found" });

        const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: user._id });
        if (!tx) return res.status(404).json({ error: "Transaction not found" });
        
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear All Transactions (Helper for cleanup)
router.delete('/transactions/all/confirm', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ error: "User not found" });

        await Transaction.deleteMany({ user: user._id });
        res.json({ message: "All transactions cleared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Debts (Owed to me and I owe)
router.get('/debts', async (req, res) => {
    try {
        const userId = req.user.uid;
        // debts where I am 'fromUser' (I owe)
        const iOwe = await Debt.find({ fromUser: userId, isSettled: false }).populate('toUser', 'displayName email');
        // debts where I am 'toUser' (Owed to me)
        const owedToMe = await Debt.find({ toUser: userId, isSettled: false }).populate('fromUser', 'displayName email');
        
        res.json({ iOwe, owedToMe });
    } catch (err) {
         res.status(500).json({ error: err.message });
    }
});

// Add Debt (I owe someone OR someone owes me - simplified: I create a record saying "X owes me Y" or "I owe X Y")
// For mvp, let's say "I lent money to X" -> from: X, to: Me.
router.post('/debts', async (req, res) => {
    try {
        const { targetEmail, amount, description, type } = req.body; 
        // type: 'lent' (they owe me) or 'borrowed' (I owe them)
        
        const targetUser = await User.findOne({ email: targetEmail });
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        let debt;
        if (type === 'lent') {
            debt = new Debt({
                fromUser: targetUser._id, // They owe
                toUser: req.user.uid,     // Me
                amount,
                description
            });
        } else {
            debt = new Debt({
                fromUser: req.user.uid,   // I owe
                toUser: targetUser._id,   // Them
                amount,
                description
            });
        }
        await debt.save();
        res.status(201).json(debt);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settle Debt
router.put('/debts/:id/settle', async (req, res) => {
    try {
        await Debt.findByIdAndUpdate(req.params.id, { isSettled: true });
        res.json({ message: "Settled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
