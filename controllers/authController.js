const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const Wallet = require('../models/Wallet');
const { generateOTP, generateReferralCode,generateUserId, successResponse, errorResponse } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');
const { createNotification } = require('../utils/notifications');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });


const buildUserPayload = (user, wallet) => ({
  id:          user._id,
  fullName:    user.fullName,
  userId:      user.userId,
  email:       user.email,
  phoneNumber: user.phoneNumber,
  role:        user.role,
  referralCode: user.referralCode,
  referredBy:  user.referredBy,
  wallet: {
    id:            wallet?._id,
    balance:       wallet?.balance       || 0,
    totalCredited: wallet?.totalCredited || 0,
    totalDebited:  wallet?.totalDebited  || 0,
  },
});



/* ─────────────────────────────────────────────────────────────
   FLOW:
   1. POST /api/auth/send-otp  { email }
      → look up user by email
      → always send OTP to that email (whether user exists or not,
        so we don't leak which emails are registered)
      → respond with { userExists: true/false }
        so frontend knows whether to show Login or Register screen

   2a. If userExists = true  →  POST /api/auth/verify-otp  { email, otp }
       → verify OTP → login → return JWT

   2b. If userExists = false →  POST /api/auth/register  { fullName, phoneNumber, email, otp }
       → verify OTP first → create user + wallet → return JWT
───────────────────────────────────────────────────────────── */


// ── STEP 1 ──────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { email }
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 'Email is required.', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Block check — only if user exists
    if (user && user.isBlocked) return errorResponse(res, 'Your account has been blocked. Contact support.', 403);
    if (user && !user.isActive) return errorResponse(res, 'Your account is deactivated. Contact support.', 403);

    // Generate OTP
    const plainOtp = generateOTP(); // 6-digit string

    console.log('plainOtp:', plainOtp);
    // Remove any existing OTP for this identifier then save new one
    await Otp.deleteMany({ identifier: normalizedEmail });

    const otpDoc = new Otp({ identifier: normalizedEmail, otpHash: plainOtp });
    await otpDoc.save(); // pre-save hook hashes the OTP

    // Send email
    try {
      const name = user?.fullName || 'User';
      const tmpl = emailTemplates.otpEmail(name, plainOtp);
      await sendEmail({ to: normalizedEmail, ...tmpl });
    } catch (emailErr) {
      console.error('OTP email send error:', emailErr.message);
      // Still respond — don't fail the request because of email
    }

    return successResponse(res, {
      userExists: !!user,
      otp: plainOtp
    }, `OTP sent to ${normalizedEmail}.`);

  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// ── STEP 2a (existing user) ──────────────────────────────────
// POST /api/auth/verify-otp
// Body: { email, otp }
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return errorResponse(res, 'Email and OTP are required.', 400);

    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP document
    const otpDoc = await Otp.findOne({ identifier: normalizedEmail });
    if (!otpDoc) return errorResponse(res, 'OTP expired or not found. Please request a new one.', 401);

    // Verify hash
    const isMatch = await otpDoc.verifyOtp(otp.toString());
    if (!isMatch) return errorResponse(res, 'Invalid OTP.', 401);

    // OTP is valid — delete it (one-time use)
    await Otp.deleteMany({ identifier: normalizedEmail });

    // Find user
    const user = await User.findOne({ email: normalizedEmail }).populate('wallet');
    if (!user) return errorResponse(res, 'No account found with this email. Please register.', 404);
    if (user.isBlocked) return errorResponse(res, 'Your account has been blocked.', 403);
    if (!user.isActive) return errorResponse(res, 'Your account is deactivated.', 403);

    const token = signToken(user._id);
    return successResponse(res, {
      token,
      user: buildUserPayload(user, user.wallet),
    }, 'Login successful.');

  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// ── STEP 2b (new user) ───────────────────────────────────────
// POST /api/auth/register
// Body: { fullName, phoneNumber, email, otp }
exports.register = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, referralCode } = req.body;
    if (!fullName || !phoneNumber || !email)
      return errorResponse(res, 'fullName, phoneNumber and email are all required.', 400);

    const normalizedEmail = email.toLowerCase().trim();

    // ── Verify OTP first ────────────────────────────────────
    // const otpDoc = await Otp.findOne({ identifier: normalizedEmail });
    // if (!otpDoc) return errorResponse(res, 'OTP expired or not found. Please request a new one.', 401);

    // const isMatch = await otpDoc.verifyOtp(otp.toString());
    // if (!isMatch) return errorResponse(res, 'Invalid OTP.', 401);

    // OTP valid — delete it
    // await Otp.deleteMany({ identifier: normalizedEmail });

    // ── Check duplicates ────────────────────────────────────
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) return errorResponse(res, 'An account with this email already exists. Please login.', 409);

    const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
    if (phoneExists) return errorResponse(res, 'This phone number is already registered.', 409);



    // ── Resolve referral ──────────────────────────────────
    let referredByUser = null;
    let userId = generateUserId();

     
    let referralLevel2By = null;

    if (referralCode) {
      referredByUser = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
      if (!referredByUser)
        return errorResponse(res, 'Invalid referral code.', 400);

      // Level 2: if the direct referrer was themselves referred by someone
      if (referredByUser.referredBy) {
        referralLevel2By = referredByUser.referredBy;
      }
    }

    // ── Generate unique referral code for new user ────────
    let newReferralCode, codeExists;
    do {
      newReferralCode = generateReferralCode();
      codeExists = await User.findOne({ referralCode: newReferralCode });
    } while (codeExists);




    // ── Create user ─────────────────────────────────────────
    const user = await User.create({
      fullName, phoneNumber: phoneNumber.trim(),
      userId ,
      email: normalizedEmail,
      referralCode: newReferralCode,
      referredBy: referredByUser?._id || null,
      referralLevel2By: referralLevel2By || null,

    });
    const wallet = await Wallet.create({ user: user._id });
    user.wallet = wallet._id;
    await user.save();

    // Welcome notification
    await createNotification(
      user._id,
      'Welcome to WalletApp! 🎉',
      `Hi ${fullName}, your account is ready. Your referral code is ${newReferralCode}.`,
      'registration',
    );

    const token = signToken(user._id);
    return successResponse(res, {
      token,
      user: buildUserPayload(user, wallet),
    }, 'Account created successfully!', 201);

  } catch (err) {
    return errorResponse(res, err.message);
  }
};


// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wallet');
    return successResponse(res, {
      id: user._id,
      fullName: user.fullName,
      userId: user.userId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralLevel2By: user.referralLevel2By,
      isActive: user.isActive,
      registeredAt: user.registeredAt,
      wallet: {
        id: user.wallet?._id,
        balance: user.wallet?.balance || 0,
        totalCredited: user.wallet?.totalCredited || 0,
        totalDebited: user.wallet?.totalDebited || 0,
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
    if (fullName) updates.fullName = fullName;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    if (!Object.keys(updates).length)
      return errorResponse(res, 'Nothing to update.', 400);

    // Check phone uniqueness if changing
    if (phoneNumber) {
      const exists = await User.findOne({ phoneNumber, _id: { $ne: req.user._id } });
      if (exists) return errorResponse(res, 'Phone number already in use.', 409);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return successResponse(res, { fullName: user.fullName, phoneNumber: user.phoneNumber }, 'Profile updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
