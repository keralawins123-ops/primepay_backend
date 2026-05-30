const mongoose = require('mongoose');

const giftCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  rewardAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  maxUsers: {
    type: Number,
    required: true,
    min: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  expiryDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Virtual: is expired
giftCodeSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date() || this.usedCount >= this.maxUsers;
});

module.exports = mongoose.model('GiftCode', giftCodeSchema);
