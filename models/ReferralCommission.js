const mongoose = require('mongoose');

// One record per daily commission payout per referrer
const referralCommissionSchema = new mongoose.Schema({
  // Who receives the commission
  beneficiary: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  // Whose income triggered this commission
  fromUser: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  // The deposit that generated the income
  deposit: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Deposit',
    required: true,
  },
  level: {
    type:    Number,
    enum:    [1, 2],   // 1 = direct referral, 2 = referral's referral
    required: true,
  },
  incomeAmount: {       // the base daily income that triggered this
    type:     Number,
    required: true,
  },
  commissionRate: {     // 5 for level1, 3 for level2
    type:     Number,
    required: true,
  },
  commissionAmount: {   // actual ₹ paid
    type:     Number,
    required: true,
  },
  date: {               // which calendar date this commission is for
    type:     Date,
    required: true,
  },
  paid: {
    type:    Boolean,
    default: false,
  },
  paidAt: Date,
}, { timestamps: true });

// Prevent double-payout for same deposit on same date at same level
referralCommissionSchema.index({ deposit: 1, date: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('ReferralCommission', referralCommissionSchema);
