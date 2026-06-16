const User               = require('../models/User');
const ReferralCommission = require('../models/ReferralCommission');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/referral/my-team
// Returns: user's referral code, direct referrals (L1), and their referrals (L2)
exports.getMyTeam = async (req, res) => {
  try {
    const userId = req.user._id;

    // Level 1 — users who used MY referral code
    const level1 = await User.find({ referredBy: userId })
      .select('fullName email phoneNumber referralCode registeredAt isActive')
      .sort({ registeredAt: -1 });

    // Level 2 — users who used any L1 member's referral code
    const l1Ids  = level1.map(u => u._id);
    const level2 = await User.find({ referredBy: { $in: l1Ids } })
      .select('fullName email phoneNumber referralCode registeredAt isActive referredBy')
      .populate('referredBy', 'fullName referralCode')
      .sort({ registeredAt: -1 });

    return successResponse(res, {
      referralCode: req.user.referralCode,
      totalL1:      level1.length,
      totalL2:      level2.length,
      level1,
      level2,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/referral/commissions
// Returns the user's referral commission history
exports.getMyCommissions = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ReferralCommission.find({ beneficiary: req.user._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', 'fullName email referralCode'),
      ReferralCommission.countDocuments({ beneficiary: req.user._id }),
    ]);

    // Total commission earned
    const totals = await ReferralCommission.aggregate([
      { $match: { beneficiary: req.user._id, paid: true } },
      { $group: {
          _id:   '$level',
          total: { $sum: '$commissionAmount' },
          count: { $sum: 1 },
      }},
    ]);

    const summary = { level1Total: 0, level2Total: 0, level1Count: 0, level2Count: 0 };
    totals.forEach(t => {
      if (t._id === 1) { summary.level1Total = t.total; summary.level1Count = t.count; }
      if (t._id === 2) { summary.level2Total = t.total; summary.level2Count = t.count; }
    });
    summary.grandTotal = summary.level1Total + summary.level2Total;

    return successResponse(res, {
      summary,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/referral/stats  (quick summary card)
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [l1Count, l2Count, commSummary] = await Promise.all([
      User.countDocuments({ referredBy: userId }),
      User.countDocuments({
        referredBy: {
          $in: await User.find({ referredBy: userId }).distinct('_id'),
        },
      }),
      ReferralCommission.aggregate([
        { $match: { beneficiary: userId, paid: true } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
      ]),
    ]);

    return successResponse(res, {
      referralCode:       req.user.referralCode,
      directReferrals:    l1Count,
      indirectReferrals:  l2Count,
      totalCommissionEarned: commSummary[0]?.total || 0,
      commissionRates: { level1: '5%', level2: '3%' },
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// ── ADMIN ──────────────────────────────────────────────────────

// GET /api/admin/referral/commissions?userId=&level=&startDate=&endDate=
exports.adminGetCommissions = async (req, res) => {
  try {
    const { userId, level, startDate, endDate } = req.query;
    const filter = {};
    if (userId)    filter.fromUser = userId;
    if (level)     filter.level    = Number(level);
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ReferralCommission.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('beneficiary', 'fullName email referralCode')
        .populate('fromUser',    'fullName email referralCode'),
      ReferralCommission.countDocuments(filter),
    ]);

    return successResponse(res, {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/admin/referral/run-income  (manual trigger for testing)
exports.adminRunIncome = async (req, res) => {
  try {
    const { runDailyIncome } = require('../utils/dailyIncomeCron');
    await runDailyIncome();
    return successResponse(res, null, 'Daily income job executed manually.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
