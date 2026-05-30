const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  bankDetails: {
    accountHolderName: { type: String, required: true },
    bankName:          { type: String, required: true },
    accountNumber:     { type: String, required: true },
    ifscCode:          { type: String, required: true },
    upiId:             { type: String },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminNote: {
    type: String,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
