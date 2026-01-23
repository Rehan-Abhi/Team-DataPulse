const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timetableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable',
    required: true,
  },
  date: {
    type: String, // Storing as YYYY-MM-DD string for easy querying
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'cancelled'],
    required: true,
  },
}, { timestamps: true });

// Ensure one record per slot per day
attendanceSchema.index({ timetableId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
