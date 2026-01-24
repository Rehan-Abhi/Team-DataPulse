const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['todo', 'inprogress', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true, 
  },
  originTimetableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable', 
    // If present, this task was auto-generated from a Timetable slot
  }
}, { timestamps: true });

module.exports = mongoose.model('Todo', todoSchema);
