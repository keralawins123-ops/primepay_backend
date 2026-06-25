const GiftCode = require('../models/GiftCode');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse, creditWallet } = require('../utils/helpers');
const { createNotification } = require('../utils/notifications');

// GET /api/admin/gift-codes
exports.getAllGiftCodes = async (req, res) => {
  try {
    const codes = await GiftCode.find().sort({ createdAt: -1 });
    return successResponse(res, codes);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/admin/gift-codes
exports.createGiftCode = async (req, res) => {
  try {
    const { code, rewardAmount, maxUsers, expiryDate } = req.body;
    const gift = await GiftCode.create({
      code: code.toUpperCase(),
      rewardAmount,
      maxUsers,
      expiryDate: new Date(expiryDate),
    });
    return successResponse(res, gift, 'Gift code created.', 201);
  } catch (err) {
    if (err.code === 11000) return errorResponse(res, 'Gift code already exists.', 409);
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/gift-codes/:id
exports.updateGiftCode = async (req, res) => {
  try {
    const gift = await GiftCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!gift) return errorResponse(res, 'Gift code not found.', 404);
    return successResponse(res, gift, 'Gift code updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// DELETE /api/admin/gift-codes/:id
exports.deleteGiftCode = async (req, res) => {
  try {
    const gift = await GiftCode.findByIdAndDelete(req.params.id);
    if (!gift) return errorResponse(res, 'Gift code not found.', 404);
    return successResponse(res, null, 'Gift code deleted.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/gift-codes/:id/toggle
exports.toggleGiftCode = async (req, res) => {
  try {
    const gift = await GiftCode.findById(req.params.id);
    if (!gift) return errorResponse(res, 'Gift code not found.', 404);
    gift.isActive = !gift.isActive;
    await gift.save();
    return successResponse(res, { isActive: gift.isActive }, `Gift code ${gift.isActive ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};




// GET /api/gift-codes/active
exports.getActiveGiftCodes = async (req, res) => {
  try {
    const now = new Date();

    const giftCodes = await GiftCode.find({
      isActive: true,
      expiryDate: { $gt: now },
      $expr: { $lt: ['$usedCount', '$maxUsers'] }
    })
      .select('code rewardAmount expiryDate maxUsers usedCount')
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      giftCodes,
      'Active gift codes fetched successfully.'
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};



// POST /api/gift-codes/redeem  { code }
exports.redeemGiftCode = async (req, res) => {
  try {
    const { code } = req.body;
    const gift = await GiftCode.findOne({ code: code.toUpperCase() });

    if (!gift) return errorResponse(res, 'Invalid gift code.', 404);
    if (!gift.isActive) return errorResponse(res, 'Gift code is disabled.', 400);
    if (gift.expiryDate < new Date()) return errorResponse(res, 'Gift code has expired.', 400);
    if (gift.usedCount >= gift.maxUsers) return errorResponse(res, 'Gift code usage limit reached.', 400);
    if (gift.usedBy.includes(req.user._id)) return errorResponse(res, 'You have already redeemed this code.', 409);

    gift.usedBy.push(req.user._id);
    gift.usedCount += 1;
    await gift.save();

    const user = await require('../models/User').findById(req.user._id).populate('wallet');
    await creditWallet(Wallet, Transaction, user._id, user.wallet._id, gift.rewardAmount, 'gift_reward', `Gift code redeemed: ${code}`);

    await createNotification(user._id, 'Gift Code Redeemed!', `You redeemed gift code ${code} and earned ₹${gift.rewardAmount}!`, 'gift_redeemed');

    return successResponse(res, { rewardAmount: gift.rewardAmount }, `Gift code redeemed! ₹${gift.rewardAmount} credited.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
