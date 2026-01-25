const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Todo',
    default: null
  },
  duration: {
    type: Number, // In minutes
    required: true,
  },
  type: {
    type: String,
    enum: ['focus', 'break'],
    default: 'focus'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
