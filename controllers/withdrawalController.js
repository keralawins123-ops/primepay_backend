const Withdrawal  = require('../models/Withdrawal');
const Wallet      = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse, paginate, debitWallet } = require('../utils/helpers');
const { createNotification, notifyAdmins }                      = require('../utils/notifications');
const { sendEmail, emailTemplates }                              = require('../utils/email');

// POST /api/withdrawals
exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    const user = req.user;

    // Check balance
    const wallet = await Wallet.findById(user.wallet);
    if (!wallet || wallet.balance < amount)
      return errorResponse(res, 'Insufficient wallet balance.', 400);

    // Hold balance (debit immediately, reverse if rejected)
    await debitWallet(Wallet, Transaction, user._id, wallet._id, amount, 'withdrawal', `Withdrawal request - ₹${amount}`);

    const withdrawal = await Withdrawal.create({
      user:        user._id,
      amount,
      bankDetails,
    });

    const User = require('../models/User');
    await notifyAdmins(User, require('../models/Notification'), 'New Withdrawal Request', `${user.fullName} requested withdrawal of ₹${amount}.`, 'admin_alert');

    return successResponse(res, { withdrawalId: withdrawal._id }, 'Withdrawal request submitted.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/withdrawals (user's own)
exports.getUserWithdrawals = async (req, res) => {
  try {
    const result = await paginate(Withdrawal, { user: req.user._id }, { ...req.query, sort: { createdAt: -1 } });
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/withdrawals
exports.getAllWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter     = status ? { status } : {};
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'fullName email phoneNumber'),
      Withdrawal.countDocuments(filter),
    ]);
    return successResponse(res, { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/withdrawals/:id/approve
exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal)                    return errorResponse(res, 'Withdrawal not found.', 404);
    if (withdrawal.status !== 'pending') return errorResponse(res, 'Already processed.', 400);

    withdrawal.status     = 'approved';
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = new Date();
    await withdrawal.save();

    const user = withdrawal.user;
    await createNotification(user._id, 'Withdrawal Approved', `Your withdrawal of ₹${withdrawal.amount} has been approved.`, 'withdrawal_approved');
    try {
      const tmpl = emailTemplates.withdrawalApproved(user.fullName, withdrawal.amount);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Withdrawal approved.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/withdrawals/:id/reject
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { reason }  = req.body;
    const withdrawal  = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal)                    return errorResponse(res, 'Withdrawal not found.', 404);
    if (withdrawal.status !== 'pending') return errorResponse(res, 'Already processed.', 400);

    withdrawal.status    = 'rejected';
    withdrawal.adminNote = reason;
    await withdrawal.save();

    // Refund wallet
    const user   = await require('../models/User').findById(withdrawal.user).populate('wallet');
    const wallet = await Wallet.findById(user.wallet);
    const balanceBefore = wallet.balance;
    wallet.balance       += withdrawal.amount;
    wallet.totalCredited += withdrawal.amount;
    wallet.totalDebited  -= withdrawal.amount;
    await wallet.save();

    await Transaction.create({
      user:         user._id,
      wallet:       wallet._id,
      type:         'admin_adjustment',
      amount:       withdrawal.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      status:       'completed',
      description:  `Withdrawal #${withdrawal._id} rejected — amount refunded`,
    });

    await createNotification(withdrawal.user._id, 'Withdrawal Rejected', `Your withdrawal of ₹${withdrawal.amount} was rejected. Amount refunded. ${reason || ''}`, 'withdrawal_rejected');
    try {
      const tmpl = emailTemplates.withdrawalRejected(withdrawal.user.fullName, withdrawal.amount, reason);
      await sendEmail({ to: withdrawal.user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Withdrawal rejected and amount refunded.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
