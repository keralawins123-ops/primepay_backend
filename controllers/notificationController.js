const Notification = require('../models/Notification');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const result = await paginate(Notification, { user: req.user._id }, { ...req.query, sort: { createdAt: -1 } });
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
    return successResponse(res, null, 'Marked as read.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return successResponse(res, null, 'All notifications marked as read.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    return successResponse(res, { count });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
