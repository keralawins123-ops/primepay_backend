const User        = require('../models/User');
const Wallet      = require('../models/Wallet');
const Deposit     = require('../models/Deposit');
const Withdrawal  = require('../models/Withdrawal');
const { Task, TaskSubmission } = require('../models/Task');
const GiftCode    = require('../models/GiftCode');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDepositsAgg,
      totalWithdrawalsAgg,
      pendingDeposits,
      pendingWithdrawals,
      totalWalletAgg,
      totalPlans,
      totalGiftCodes,
      taskStats,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true, isBlocked: false }),
      Deposit.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Withdrawal.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
      require('../models/Plan').countDocuments(),
      GiftCode.countDocuments(),
      TaskSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const taskStatsMap = { pending: 0, approved: 0, rejected: 0 };
    taskStats.forEach(t => { taskStatsMap[t._id] = t.count; });

    return successResponse(res, {
      totalUsers,
      activeUsers,
      totalDeposits:    totalDepositsAgg[0]?.total    || 0,
      totalWithdrawals: totalWithdrawalsAgg[0]?.total  || 0,
      pendingDeposits,
      pendingWithdrawals,
      totalWalletBalance: totalWalletAgg[0]?.total    || 0,
      totalPlans,
      totalGiftCodes,
      taskStats: taskStatsMap,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = { role: 'user' };

    if (search) {
      filter.$or = [
        { fullName:    { $regex: search, $options: 'i' } },
        { email:       { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active')   filter.isActive  = true;
    if (status === 'inactive') filter.isActive  = false;
    if (status === 'blocked')  filter.isBlocked = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('wallet'),
      User.countDocuments(filter),
    ]);

    return successResponse(res, {
      data: data.map(u => ({
        id:              u._id,
        fullName:        u.fullName,
        email:           u.email,
        phoneNumber:     u.phoneNumber,
        isActive:        u.isActive,
        isBlocked:       u.isBlocked,
        isEmailVerified: u.isEmailVerified,
        registeredAt:    u.registeredAt,
        wallet: {
          balance:       u.wallet?.balance       || 0,
          totalCredited: u.wallet?.totalCredited || 0,
          totalDebited:  u.wallet?.totalDebited  || 0,
        },
      })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/users/:id
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('wallet');
    if (!user) return errorResponse(res, 'User not found.', 404);

    const [deposits, withdrawals, transactions] = await Promise.all([
      Deposit.find({ user: user._id }).sort({ createdAt: -1 }).limit(10),
      Withdrawal.find({ user: user._id }).sort({ createdAt: -1 }).limit(10),
      Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
    ]);

    return successResponse(res, { user, deposits, withdrawals, transactions });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/users/:id/block
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found.', 404);
    user.isBlocked = true;
    await user.save();
    return successResponse(res, null, 'User blocked.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/users/:id/unblock
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 'User not found.', 404);
    user.isBlocked = false;
    await user.save();
    return successResponse(res, null, 'User unblocked.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/users/:id/activate
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!user) return errorResponse(res, 'User not found.', 404);
    return successResponse(res, null, 'User activated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/users/:id/deactivate
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return errorResponse(res, 'User not found.', 404);
    return successResponse(res, null, 'User deactivated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
