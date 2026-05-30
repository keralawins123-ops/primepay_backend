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
  paymentMethods: {
    qrCode: {
      enabled:  { type: Boolean, default: false },
      imageUrl: { type: String, default: '' },
    },
    bankAccount: {
      enabled:       { type: Boolean, default: false },
      accountHolder: { type: String, default: '' },
      bankName:      { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode:      { type: String, default: '' },
      upiId:         { type: String, default: '' },
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
