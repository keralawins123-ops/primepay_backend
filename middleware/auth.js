const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/helpers');

// Protect routes — must be logged in
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return errorResponse(res, 'Not authorized. Please log in.', 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('wallet');
    if (!user) return errorResponse(res, 'User not found.', 401);
    if (user.isBlocked) return errorResponse(res, 'Your account has been blocked.', 403);
    if (!user.isActive) return errorResponse(res, 'Your account is deactivated.', 403);
    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Invalid or expired token.', 401);
  }
};

// Restrict to admin
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied. Admins only.', 403);
  }
  next();
};

// Maintenance mode check (skip for admin)
exports.checkMaintenance = async (req, res, next) => {
  try {
    const AppSettings = require('../models/AppSettings');
    const settings = await AppSettings.findOne();
    if (settings && settings.maintenanceMode && req.user?.role !== 'admin') {
      return errorResponse(res, settings.maintenanceMessage || 'App is under maintenance.', 503);
    }
    next();
  } catch (err) {
    next();
  }
};
