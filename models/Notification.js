const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'registration', 'deposit_approved', 'deposit_rejected',
      'withdrawal_approved', 'withdrawal_rejected',
      'task_approved', 'task_rejected',
      'gift_redeemed', 'admin_alert', 'general',
    ],
    default: 'general',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
