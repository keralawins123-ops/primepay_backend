// controllers/upiController.js

const UpiAccount = require('../models/UpiAccount');
const {
  successResponse,
  errorResponse,
} = require('../utils/helpers');


// Add UPI
exports.addUpiAccount = async (req, res) => {
  try {
    const { upiId, accountHolderName, isPrimary } = req.body;

    const existing = await UpiAccount.findOne({
      user: req.user._id,
      upiId: upiId.toLowerCase(),
    });

    if (existing) {
      return errorResponse(res, 'UPI ID already exists.');
    }

    if (isPrimary) {
      await UpiAccount.updateMany(
        { user: req.user._id },
        { isPrimary: false }
      );
    }

    const upi = await UpiAccount.create({
      user: req.user._id,
      upiId: upiId.toLowerCase(),
      accountHolderName,
      isPrimary,
    });

    return successResponse(
      res,
      upi,
      'UPI account added successfully.',
      201
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// User UPI List
exports.getMyUpiAccounts = async (req, res) => {
  try {
    const upis = await UpiAccount.find({
      user: req.user._id,
      isActive: true,
    }).sort({ isPrimary: -1 });

    return successResponse(res, upis);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// Update UPI
exports.updateUpiAccount = async (req, res) => {
  try {
    const { accountHolderName, isPrimary } = req.body;

    const upi = await UpiAccount.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!upi) {
      return errorResponse(res, 'UPI account not found.', 404);
    }

    if (isPrimary) {
      await UpiAccount.updateMany(
        { user: req.user._id },
        { isPrimary: false }
      );
    }

    if (accountHolderName) {
      upi.accountHolderName = accountHolderName;
    }

    if (typeof isPrimary === 'boolean') {
      upi.isPrimary = isPrimary;
    }

    await upi.save();

    return successResponse(
      res,
      upi,
      'UPI account updated successfully.'
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// Delete UPI
exports.deleteUpiAccount = async (req, res) => {
  try {
    const upi = await UpiAccount.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!upi) {
      return errorResponse(res, 'UPI account not found.', 404);
    }

    return successResponse(
      res,
      null,
      'UPI account deleted successfully.'
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// Set Primary UPI
exports.setPrimaryUpi = async (req, res) => {
  try {
    const upi = await UpiAccount.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!upi) {
      return errorResponse(res, 'UPI account not found.', 404);
    }

    await UpiAccount.updateMany(
      { user: req.user._id },
      { isPrimary: false }
    );

    upi.isPrimary = true;
    await upi.save();

    return successResponse(
      res,
      upi,
      'Primary UPI updated.'
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// Admin - All UPI Accounts
exports.getAllUpiAccounts = async (req, res) => {
  try {
    const accounts = await UpiAccount.find()
      .populate('user', 'fullName phoneNumber email')
      .sort({ createdAt: -1 });

    return successResponse(res, accounts);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};