const Wallet      = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Deposit     = require('../models/Deposit');
const { successResponse, errorResponse, paginate, creditWallet, debitWallet } = require('../utils/helpers');

// GET /api/wallet
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 'Wallet not found.', 404);

    // Calculate total and pending rewards
    const [pendingDeposits, approvedDeposits] = await Promise.all([
      Deposit.find({ user: req.user._id, status: 'pending' }),
      Deposit.find({ user: req.user._id, status: 'approved' }),
    ]);

    const pendingRewards = pendingDeposits.reduce((sum, d) => sum + (d.incomeAmount || 0), 0);
    const totalRewards = approvedDeposits.reduce((sum, d) => sum + (d.incomeAmount || 0), 0);

    return successResponse(res, {
      id:            wallet._id,
      balance:       wallet.balance,
      totalCredited: wallet.totalCredited,
      totalDebited:  wallet.totalDebited,
      totalRewards,
      pendingRewards,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/wallet/transactions
exports.getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 'Wallet not found.', 404);

    const result = await paginate(Transaction, { wallet: wallet._id }, req.query);
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// Admin: POST /api/admin/wallet/adjust
exports.adminAdjustWallet = async (req, res) => {
  try {
    const { userId, amount, type, description } = req.body; // type: 'credit' | 'debit'
    const User   = require('../models/User');
    const targetUser = await User.findById(userId).populate('wallet');
    if (!targetUser) return errorResponse(res, 'User not found.', 404);

    let result;
    if (type === 'credit') {
      result = await creditWallet(Wallet, Transaction, userId, targetUser.wallet._id, amount, 'admin_adjustment', description || 'Admin credit');
    } else {
      result = await debitWallet(Wallet, Transaction, userId, targetUser.wallet._id, amount, 'admin_adjustment', description || 'Admin debit');
    }

    const { createNotification } = require('../utils/notifications');
    await createNotification(userId, 'Wallet Adjusted', `Admin has ${type}ed ₹${amount} ${type === 'credit' ? 'to' : 'from'} your wallet.`);

    return successResponse(res, { balance: result.wallet.balance }, `Wallet ${type}ed successfully.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
