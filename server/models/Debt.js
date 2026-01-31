const mongoose = require('mongoose');

const DebtSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lenderName: { type: String },   // Used if fromUser is null
  borrowerName: { type: String }, // Used if toUser is null
  amount: { type: Number, required: true },
  description: { type: String },
  isSettled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Debt', DebtSchema);
