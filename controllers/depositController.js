const Deposit = require('../models/Deposit');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse, paginate, creditWallet } = require('../utils/helpers');
const { createNotification, notifyAdmins } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/email');
const Plan = require('../models/Plan');

// POST /api/deposits  (multipart/form-data)
exports.createDeposit = async (req, res) => {
  try {
    const { planId, amount, transactionRef } = req.body;
    console.log(req.body)
    if (!req.file) return errorResponse(res, 'Payment proof is required.', 400);

    // Calculate income amount for pending rewards
    let incomeAmount = 0;
    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        incomeAmount = plan.incomeOnApproval > 0
          ? Math.round((Number(amount) * plan.incomeOnApproval) / 100 * 100) / 100
          : 0;
      }
    }

    const deposit = await Deposit.create({
      user: req.user._id,
      plan: planId,
      amount: Number(amount),
      paymentProof: req.file.path,
      transactionRef,
      incomeAmount,
    });

    const User = require('../models/User');
    await notifyAdmins(User, require('../models/Notification'), 'New Deposit Request', `${req.user.fullName} submitted a deposit of ₹${amount}.`, 'admin_alert');

    return successResponse(res, { depositId: deposit }, 'Deposit submitted. Awaiting approval.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/deposits (user's own)
exports.getUserDeposits = async (req, res) => {
  try {
    const result = await paginate(
      Deposit,
      { user: req.user._id },
      { ...req.query, sort: { createdAt: -1 } }
    );
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/deposits
exports.getAllDeposits = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Deposit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'fullName email phoneNumber')
        .populate('plan', 'name amount'),
      Deposit.countDocuments(filter),
    ]);

    return successResponse(res, { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/deposits/:id/approve
exports.approveDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return errorResponse(res, 'Deposit not found.', 404);
    if (deposit.status !== 'pending') return errorResponse(res, 'Deposit already processed.', 400);


  
    console.log("deposit.plan", deposit.plan )

     const plan = await Plan.findById(deposit.plan);

    console.log("plan", plan)

    // ── Calculate bonus ────────────────────────────────────
    const incomeAmount = plan.incomeOnApproval > 0
      ? Math.round((plan.amount * plan.incomeOnApproval) / 100 * 100) / 100
      : 0;
    const totalCredit = plan.amount + incomeAmount;

    console.log("hello deposit ", incomeAmount);


    deposit.status = 'approved';
    deposit.approvedBy = req.user._id;
    deposit.approvedAt = new Date();
    deposit.incomeAmount = incomeAmount;
    deposit.totalCreditedOnApproval = totalCredit;
    await deposit.save();

    // Credit wallet
    const user = await require('../models/User').findById(deposit.user).populate('wallet');
    await creditWallet(Wallet, Transaction, user._id, user.wallet._id, totalCredit, 'deposit', `Deposit #${deposit._id} approved`);

    // Notify user
    await createNotification(user._id, 'Deposit Approved', `Your deposit of ₹${totalCredit} has been approved.`, 'deposit_approved');
    try {
      const tmpl = emailTemplates.depositApproved(user.fullName, totalCredit);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Deposit approved and wallet credited.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/deposits/:id/reject
exports.rejectDeposit = async (req, res) => {
  try {
    const { reason } = req.body;
    const deposit = await Deposit.findById(req.params.id).populate('user');
    if (!deposit) return errorResponse(res, 'Deposit not found.', 404);
    if (deposit.status !== 'pending') return errorResponse(res, 'Deposit already processed.', 400);

    deposit.status = 'rejected';
    deposit.adminNote = reason;
    await deposit.save();

    const user = deposit.user;
    await createNotification(user._id, 'Deposit Rejected', `Your deposit of ₹${deposit.amount} was rejected. ${reason || ''}`, 'deposit_rejected');
    try {
      const tmpl = emailTemplates.depositRejected(user.fullName, deposit.amount, reason);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Deposit rejected.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
