const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  identifier: {
    type:     String,
    required: true,
    index:    true,
  },
  otpHash: {
    type:     String,
    required: true,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
    expires: 600, // Auto-delete after 10 minutes (MongoDB TTL index)
  },
}, { timestamps: true });

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otpHash')) return next();
  this.otpHash = await bcrypt.hash(this.otpHash, 10);
  next();
});

// Verify plain OTP against stored hash
otpSchema.methods.verifyOtp = async function (plainOtp) {
  return await bcrypt.compare(plainOtp, this.otpHash);
};

module.exports = mongoose.model('Otp', otpSchema);
