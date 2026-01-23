const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true, // Subject name or Activity name
  },
  day: {
    type: String,
    required: true, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  startTime: {
    type: String, // HH:mm format, e.g., "09:00"
    required: true,
  },
  endTime: {
    type: String, // HH:mm format
    required: true,
  },
  location: {
    type: String, // Room number or Place
  },
  type: {
    type: String,
    enum: ['academic', 'personal'],
    default: 'academic',
  },
  // Optional: distinct color code passed from frontend, or determined by type
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
