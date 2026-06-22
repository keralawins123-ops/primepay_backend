const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    default: 'App is under maintenance. Please check back later.',
  },
  forceUpdate: {
    type: Boolean,
    default: false,
  },
  updateMessage: {
    type: String,
    default: 'A new version is available. Please update to continue.',
  },
  currentVersion: {
    type: String,
    default: '1.0.0',
  },
  // ── Payment Methods Enable/Disable ────────────────────────
  paymentMethods: {
    upiEnabled: {
      type:    Boolean,
      default: false,  // User sees admin UPI accounts if true
    },
    bankEnabled: {
      type:    Boolean,
      default: false,  // User sees bank account if true
    },
  },

  contacts: [{
    type:     { type: String, enum: ['whatsapp', 'telegram', 'email', 'phone', 'website', 'support'] },
    label:    { type: String },
    value:    { type: String },
    isActive: { type: Boolean, default: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);
