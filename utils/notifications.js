const Notification = require('../models/Notification');

const createNotification = async (userId, title, message, type = 'general', meta = {}) => {
  try {
    await Notification.create({ user: userId, title, message, type, meta });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const notifyAdmins = async (User, Notification, title, message, type = 'admin_alert') => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const notifications = admins.map(admin => ({
      user: admin._id,
      title,
      message,
      type,
    }));
    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Admin notification error:', err.message);
  }
};

module.exports = { createNotification, notifyAdmins };
