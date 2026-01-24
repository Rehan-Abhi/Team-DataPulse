const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  semesterName: {
    type: String,
    required: true,
  },
  courses: [{
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    grade: { type: String, required: true },
    gradePoint: { type: Number, required: true }
  }],
  sgpa: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Semester', semesterSchema);
