const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const User    = require('../models/User');
const Wallet  = require('../models/Wallet');
const { generateToken, generateOTP, successResponse, errorResponse } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');
const { createNotification } = require('../utils/notifications');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existing) {
      if (existing.email === email)
        return errorResponse(res, 'Email already registered.', 409);
      return errorResponse(res, 'Phone number already registered.', 409);
    }

    const verificationToken   = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      fullName,
      phoneNumber,
      email,
      password,
      emailVerificationToken:   verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Create wallet
    const wallet = await Wallet.create({ user: user._id });
    user.wallet  = wallet._id;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      const tmpl = emailTemplates.verifyEmail(fullName, verificationToken);
      await sendEmail({ to: email, ...tmpl });
    } catch (emailErr) {
      console.error('Email send error:', emailErr.message);
    }

    await createNotification(user._id, 'Welcome!', `Welcome to WalletApp, ${fullName}! Please verify your email.`, 'registration');

    return successResponse(res, { userId: user._id }, 'Registration successful! Please check your email to verify your account.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      emailVerificationToken:   token,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) return errorResponse(res, 'Invalid or expired verification link.', 400);

    user.isEmailVerified            = true;
    user.emailVerificationToken     = undefined;
    user.emailVerificationExpires   = undefined;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, null, 'Email verified successfully! You can now log in.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/auth/send-otp   { emailOrPhone }
exports.sendOtp = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }],
    });
    if (!user)                   return errorResponse(res, 'No account found.', 404);
    if (!user.isEmailVerified)   return errorResponse(res, 'Please verify your email first.', 403);
    if (user.isBlocked)          return errorResponse(res, 'Your account is blocked.', 403);

    const otp        = generateOTP();
    user.otp         = otp;
    user.otpExpires  = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save({ validateBeforeSave: false });

    try {
      const tmpl = emailTemplates.otpEmail(user.fullName, otp);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (emailErr) {
      console.error('OTP email error:', emailErr.message);
    }

    return successResponse(res, null, 'OTP sent to your registered email.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/auth/verify-otp  { emailOrPhone, otp }
exports.verifyOtp = async (req, res) => {
  try {
    const { emailOrPhone, otp } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }],
      otp,
      otpExpires: { $gt: new Date() },
    }).populate('wallet');

    if (!user) return errorResponse(res, 'Invalid or expired OTP.', 401);

    user.otp        = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    return successResponse(res, {
      token,
      user: {
        id:        user._id,
        fullName:  user.fullName,
        email:     user.email,
        phone:     user.phoneNumber,
        role:      user.role,
        walletId:  user.wallet?._id,
        balance:   user.wallet?.balance,
      },
    }, 'Login successful.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wallet');
    return successResponse(res, {
      id:              user._id,
      fullName:        user.fullName,
      email:           user.email,
      phoneNumber:     user.phoneNumber,
      role:            user.role,
      isEmailVerified: user.isEmailVerified,
      isActive:        user.isActive,
      registeredAt:    user.registeredAt,
      wallet: {
        id:            user.wallet?._id,
        balance:       user.wallet?.balance,
        totalCredited: user.wallet?.totalCredited,
        totalDebited:  user.wallet?.totalDebited,
      },
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;
    const updates = {};
    if (fullName)    updates.fullName    = fullName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return successResponse(res, { fullName: user.fullName, phoneNumber: user.phoneNumber }, 'Profile updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
