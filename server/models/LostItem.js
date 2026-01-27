const mongoose = require('mongoose');

const LostItemSchema = new mongoose.Schema({
    university: { type: String, required: true },
    
    type: { 
        type: String, 
        required: true,
        enum: ['Lost', 'Found'] 
    },
    
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String, required: true },
    
    // Who posted it
    finder: {
        name: String,
        uid: String
    },
    
    status: { 
        type: String, 
        enum: ['Open', 'Resolved'],
        default: 'Open'
    },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LostItem', LostItemSchema);
