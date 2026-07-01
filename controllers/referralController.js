const User               = require('../models/User');
const ReferralCommission = require('../models/ReferralCommission');
const { successResponse, errorResponse } = require('../utils/helpers');
const Deposit = require('../models/Deposit');

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
    const limit = parseInt(req.query.limit) || 2000;
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













// ════════════════════════════════════════════════════════════════
// NEW: GET /api/referral/team-deposits
// Shows deposits from your 2-level team (L1 + L2)
// Separate by referral level
// ════════════════════════════════════════════════════════════════
 
exports.getTeamDeposits = async (req, res) => {
  try {
    const userId = req.user._id;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 2000;
    const skip  = (page - 1) * limit;
 
    // Get my direct referrals (L1)
    const level1Users = await User.find({ referredBy: userId }).select('_id');
    const l1UserIds = level1Users.map(u => u._id);
 
    // Get my indirect referrals (L2) — users referred by my L1 members
    const level2Users = await User.find({ referredBy: { $in: l1UserIds } }).select('_id');
    const l2UserIds = level2Users.map(u => u._id);
 
    // Get all deposits from L1 and L2 users
    const allTeamUserIds = [...l1UserIds, ...l2UserIds];
 
    // Separate deposits by level
    const [l1Deposits, l2Deposits] = await Promise.all([
      Deposit.find({ user: { $in: l1UserIds } })
        .sort({ createdAt: -1 })
        .populate('user', 'fullName email referralCode')
        .populate('plan', 'name amount')
        .lean(),
      Deposit.find({ user: { $in: l2UserIds } })
        .sort({ createdAt: -1 })
        .populate('user', 'fullName email referralCode')
        .populate('plan', 'name amount')
        .lean(),
    ]);
 
    // Add level info to each deposit
    const l1DepositData = l1Deposits.map(d => ({
      ...d,
      referralLevel: 1,
      referrerName: 'Direct Referral',
    }));
 
    const l2DepositData = l2Deposits.map(d => ({
      ...d,
      referralLevel: 2,
      referrerName: 'Indirect Referral',
    }));
 
    // Combine and sort by date
    const allDeposits = [...l1DepositData, ...l2DepositData]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);
 
    // Get totals
    const [l1Total, l2Total, l1Count, l2Count] = await Promise.all([
      Deposit.aggregate([
        { $match: { user: { $in: l1UserIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Deposit.aggregate([
        { $match: { user: { $in: l2UserIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Deposit.countDocuments({ user: { $in: l1UserIds } }),
      Deposit.countDocuments({ user: { $in: l2UserIds } }),
    ]);
 
    const totalDeposits = l1Count + l2Count;
 
    return successResponse(res, {
      summary: {
        totalTeamDeposits: totalDeposits,
        l1DepositsCount:   l1Count,
        l2DepositsCount:   l2Count,
        l1DepositsTotal:   l1Total[0]?.total || 0,
        l2DepositsTotal:   l2Total[0]?.total || 0,
        l1L2DepositsTotal: (l1Total[0]?.total || 0) + (l2Total[0]?.total || 0),
      },
      deposits: allDeposits,
      pagination: {
        total: totalDeposits,
        page,
        limit,
        pages: Math.ceil(totalDeposits / limit),
      },
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
