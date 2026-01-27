const mongoose = require('mongoose');

const DebtSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The one who owes
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // The one who is owed
  amount: { type: Number, required: true },
  description: { type: String },
  isSettled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Debt', DebtSchema);
