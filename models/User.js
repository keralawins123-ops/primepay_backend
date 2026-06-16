const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type:     String,
    required: [true, 'Full name is required'],
    trim:     true,
  },
  phoneNumber: {
    type:     String,
    required: [true, 'Phone number is required'],
    unique:   true,
    trim:     true,
  },
  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,
    lowercase: true,
    trim:      true,
  },
  role: {
    type:    String,
    enum:    ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type:    Boolean,
    default: true,
  },
  isBlocked: {
    type:    Boolean,
    default: false,
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Wallet',
  },


  // ── Referral ──────────────────────────────────────────────
  referralCode: {
    type:   String,
    unique: true,
    uppercase: true,
  },
  referredBy: {               // direct referrer (Level 1 upline)
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    default: null,
  },
  referralLevel2By: {         // level-2 upline (referrer of referrer)
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    default: null,
  },

  
  registeredAt: {
    type:    Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
