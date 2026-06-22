const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentProof: {
    type: String, // file path/url
    required: true,
  },
  transactionRef: {
    type: String,
    required: true,
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
  incomeAmount: {
    type: Number,
    default: 0,
  },
  totalCreditedOnApproval: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Deposit', depositSchema);
