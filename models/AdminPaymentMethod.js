const mongoose = require('mongoose');

const adminPaymentMethodSchema = new mongoose.Schema({
  type: {
    type:     String,
    enum:     ['upi', 'bank'],
    required: true,
  },
  
  // ── UPI Fields ─────────────────────────────────────────────
  upiId: {
    type:   String,
    trim:   true,
    lowercase: true,
  },
  upiPayeeName: {
    type:   String,
    trim:   true,
  },

  // ── Bank Fields ────────────────────────────────────────────
  accountHolderName: String,
  bankName:          String,
  accountNumber:     String,
  ifscCode:          String,

  isActive: {
    type:    Boolean,
    default: true,
  },
  
}, { timestamps: true });

module.exports = mongoose.model('AdminPaymentMethod', adminPaymentMethodSchema);
