const mongoose = require('mongoose');

const LibraryItemSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Firebase UID
    university: { type: String, required: true }, // The key for filtering
    
    title: { type: String, required: true },
    description: { type: String },
    
    category: { 
        type: String, 
        required: true,
        enum: ['Physics', 'Chemistry', 'Mathematics', 'Coding', 'Electronics', 'Mechanics', 'Humanities', 'Other'] 
    },
    
    link: { type: String, required: true }, // URL to drive/file
    
    uploadedBy: { type: String }, // User display name
    
    createdAt: { type: Date, default: Date.now },
    votes: { type: Number, default: 0 }
});

module.exports = mongoose.model('LibraryItem', LibraryItemSchema);
