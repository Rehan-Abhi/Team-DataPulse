const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    author: {
        name: String,
        uid: String
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const DiscussionPostSchema = new mongoose.Schema({
    university: { type: String, required: true },
    
    type: { 
        type: String, 
        required: true,
        enum: ['Discussion', 'Announcement', 'GroupStudy', 'Question'] 
    },
    
    title: { type: String, required: true },
    content: { type: String, required: true },
    
    author: {
        name: String,
        uid: String
    },
    
    // Array of User UIDs who upvoted
    upvotes: [{ type: String }],
    
    comments: [CommentSchema],
    
    isSolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiscussionPost', DiscussionPostSchema);
