const Deposit = require('../models/Deposit');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse, paginate, creditWallet } = require('../utils/helpers');
const { createNotification, notifyAdmins } = require('../utils/notifications');
const { sendEmail, emailTemplates } = require('../utils/email');
const Plan = require('../models/Plan');

const ReferralCommission = require('../models/ReferralCommission');
const User = require('../models/User');


// Referral commission rates
const L1_RATE = 5; // Direct referrer
const L2_RATE = 3; // Referrer's referrer
 


// POST /api/deposits  (multipart/form-data)
exports.createDeposit = async (req, res) => {

  console.log("calling create deposit", req.body);
  
  try {
    const { planId, amount, transactionRef } = req.body;
    console.log(req.body)
    if (!req.file) return errorResponse(res, 'Payment proof is required.', 400);

    // Check for existing deposit with same transactionRef for this user
    const existingDeposit = await Deposit.findOne({ 
      user: req.user._id, 
      transactionRef 
    });
    if (existingDeposit) {
      return errorResponse(res, 'Deposit with this transaction reference already exists.', 400);
    }

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

    return successResponse(res, { depositId: deposit._id }, 'Deposit submitted. Awaiting approval.', 201);
  } catch (err) {
    // Handle duplicate key error from unique index
    if (err.code === 11000) {
      return errorResponse(res, 'Deposit with this transaction reference already exists.', 400);
    }
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
    // const User = await require('../models/User').findById(deposit.user).populate('wallet');
    // await creditWallet(Wallet, Transaction, user._id, user.wallet._id, totalCredit, 'deposit', `Deposit #${deposit._id} approved`);

    // // Notify user
    // await createNotification(user._id, 'Deposit Approved', `Your deposit of ₹${totalCredit} has been approved.`, 'deposit_approved');


    // try {
    //   const tmpl = emailTemplates.depositApproved(user.fullName, totalCredit);
    //   await sendEmail({ to: user.email, ...tmpl });
    // } catch (e) { /* non-fatal */ }



      // ── Credit investor's wallet ────────────────────────────
    const investor = await User.findById(deposit.user).populate('wallet');
    await creditWallet(Wallet, Transaction, investor._id, investor.wallet._id, totalCredit, 'deposit', `Deposit #${deposit._id} approved`);
 
    // ── Notify investor ──────────────────────────────────────
    await createNotification(investor._id, 'Deposit Approved', `Your deposit of ₹${totalCredit} has been approved.`, 'deposit_approved');
    try {
      const tmpl = emailTemplates.depositApproved(investor.fullName, totalCredit);
      await sendEmail({ to: investor.email, ...tmpl });
    } catch (e) { /* non-fatal */ }






     // Get investor's referrer (Level 1)
    const investorWithReferral = await User.findById(deposit.user);
    
    // Level 1: Direct referrer gets 5% of income
    if (investorWithReferral.referredBy) {
      const l1User = await User.findById(investorWithReferral.referredBy).populate('wallet');
      if (l1User && l1User.wallet && !l1User.isBlocked && l1User.isActive) {
        const l1Commission = Math.round((incomeAmount * L1_RATE) / 100 * 100) / 100;
        
        // Credit L1 wallet
        await creditWallet(
          Wallet,
          Transaction,
          l1User._id,
          l1User.wallet._id,
          l1Commission,
          'referral_commission',
          `L1 Referral Commission from ${investor.fullName} (${L1_RATE}% of ₹${incomeAmount})`
        );
 
        // Create ReferralCommission record
        await ReferralCommission.create({
          beneficiary: l1User._id,
          fromUser: deposit.user,
          deposit: deposit._id,
          level: 1,
          incomeAmount,
          commissionRate: L1_RATE,
          commissionAmount: l1Commission,
          date: new Date(),
          paid: true,
          paidAt: new Date(),
        });
 
        // Notify L1 referrer
        await createNotification(
          l1User._id,
          'Referral Commission Earned',
          `You earned ₹${l1Commission} L1 referral commission from ${investor.fullName}'s deposit.`,
          'referral_commission'
        );
 
        console.log(`L1 Commission: ${l1User.fullName} earned ₹${l1Commission}`);
      }
    }
 
    // Level 2: Referrer's referrer gets 3% of income
    if (investorWithReferral.referralLevel2By) {
      const l2User = await User.findById(investorWithReferral.referralLevel2By).populate('wallet');
      if (l2User && l2User.wallet && !l2User.isBlocked && l2User.isActive) {
        const l2Commission = Math.round((incomeAmount * L2_RATE) / 100 * 100) / 100;
        
        // Credit L2 wallet
        await creditWallet(
          Wallet,
          Transaction,
          l2User._id,
          l2User.wallet._id,
          l2Commission,
          'referral_commission',
          `L2 Referral Commission from ${investor.fullName} (${L2_RATE}% of ₹${incomeAmount})`
        );
 
        // Create ReferralCommission record
        await ReferralCommission.create({
          beneficiary: l2User._id,
          fromUser: deposit.user,
          deposit: deposit._id,
          level: 2,
          incomeAmount,
          commissionRate: L2_RATE,
          commissionAmount: l2Commission,
          date: new Date(),
          paid: true,
          paidAt: new Date(),
        });
 
        // Notify L2 referrer
        await createNotification(
          l2User._id,
          'Referral Commission Earned',
          `You earned ₹${l2Commission} L2 referral commission from ${investor.fullName}'s deposit.`,
          'referral_commission'
        );
 
        console.log(`L2 Commission: ${l2User.fullName} earned ₹${l2Commission}`);
      }
    }



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
