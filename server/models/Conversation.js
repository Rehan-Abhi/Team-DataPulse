const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: { type: String, required: true }, // UID
    senderName: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
    // Participants UIDs
    participants: [{ type: String, required: true }],
    
    // Metadata
    relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem' },
    
    messages: [MessageSchema],
    
    lastMessageAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', ConversationSchema);
