/**
 * DAILY INCOME & REFERRAL COMMISSION CRON JOB
 * Runs every day at midnight (00:00)
 *
 * For each active deposit:
 *   1. Credit daily income to the investor
 *   2. Check if investor was referred — pay Level 1 upline 5% of that income
 *   3. Check if Level 1 upline was referred — pay Level 2 upline 3% of that income
 *   4. Mark deposit inactive when durationDays exhausted
 */

const cron              = require('node-cron');
const Deposit           = require('../models/Deposit');
const User              = require('../models/User');
const Wallet            = require('../models/Wallet');
const Transaction       = require('../models/Transaction');
const ReferralCommission = require('../models/ReferralCommission');
const Notification      = require('../models/Notification');
const { createNotification } = require('./notifications');

// Commission rates
const L1_RATE = 5; // % for direct referrer
const L2_RATE = 3; // % for referrer's referrer

// ── Core payout function ──────────────────────────────────────
async function creditUserWallet(userId, walletId, amount, txnType, description, meta = {}) {
  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw new Error(`Wallet ${walletId} not found`);

  const balanceBefore   = wallet.balance;
  wallet.balance        += amount;
  wallet.totalCredited  += amount;
  await wallet.save();

  await Transaction.create({
    user:         userId,
    wallet:       walletId,
    type:         txnType,
    amount,
    balanceBefore,
    balanceAfter: wallet.balance,
    status:       'completed',
    description,
    meta,
  });
}

// ── Main daily job ────────────────────────────────────────────
async function runDailyIncome() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`[CRON] Daily income job started — ${today.toDateString()}`);

  // Find all deposits where income is still active and today is within range
  const activeDeposits = await Deposit.find({
    incomeActive:    true,
    incomeStartDate: { $lte: today },
    incomeEndDate:   { $gte: today },
  }).populate({ path: 'user', populate: { path: 'wallet' } });

  console.log(`[CRON] ${activeDeposits.length} active deposits to process`);

  let totalPaid = 0;

  for (const deposit of activeDeposits) {
    try {
      const investor       = deposit.user;
      const investorWallet = investor.wallet;
      const dailyAmount    = deposit.dailyIncomeAmount;

      if (!investorWallet) {
        console.warn(`[CRON] Wallet missing for user ${investor._id}`);
        continue;
      }

      // ── 1. Credit daily income to investor ─────────────────
      await creditUserWallet(
        investor._id,
        investorWallet._id,
        dailyAmount,
        'task_reward',   // reusing type — use 'daily_income' if you add it to Transaction enum
        `Daily income — deposit #${deposit._id} (Day ${deposit.incomePaidDays + 1})`,
        { depositId: deposit._id, day: deposit.incomePaidDays + 1 },
      );

      await createNotification(
        investor._id,
        'Daily Income Credited 💰',
        `₹${dailyAmount} daily income has been credited to your wallet.`,
        'general',
      );

      deposit.incomePaidDays += 1;
      totalPaid++;

      // ── 2. Level 1 referral commission ────────────────────
      if (investor.referredBy) {
        const l1User = await User.findById(investor.referredBy).populate('wallet');
        if (l1User && l1User.wallet && !l1User.isBlocked && l1User.isActive) {
          const l1Amount = Math.round((dailyAmount * L1_RATE) / 100 * 100) / 100;

          // Prevent double-payout (unique index on deposit+date+level)
          const alreadyPaid = await ReferralCommission.findOne({
            deposit: deposit._id,
            date:    today,
            level:   1,
          });

          if (!alreadyPaid) {
            await creditUserWallet(
              l1User._id,
              l1User.wallet._id,
              l1Amount,
              'gift_reward',   // reuse — or add 'referral_commission' to enum
              `Level 1 referral commission from ${investor.fullName} — ₹${l1Amount} (${L1_RATE}% of ₹${dailyAmount})`,
              { depositId: deposit._id, fromUserId: investor._id, level: 1 },
            );

            await ReferralCommission.create({
              beneficiary:      l1User._id,
              fromUser:         investor._id,
              deposit:          deposit._id,
              level:            1,
              incomeAmount:     dailyAmount,
              commissionRate:   L1_RATE,
              commissionAmount: l1Amount,
              date:             today,
              paid:             true,
              paidAt:           new Date(),
            });

            await createNotification(
              l1User._id,
              'Referral Commission 🎁',
              `You earned ₹${l1Amount} Level-1 referral commission from ${investor.fullName}'s daily income.`,
              'general',
            );
          }
        }
      }

      // ── 3. Level 2 referral commission ────────────────────
      if (investor.referralLevel2By) {
        const l2User = await User.findById(investor.referralLevel2By).populate('wallet');
        if (l2User && l2User.wallet && !l2User.isBlocked && l2User.isActive) {
          const l2Amount = Math.round((dailyAmount * L2_RATE) / 100 * 100) / 100;

          const alreadyPaid = await ReferralCommission.findOne({
            deposit: deposit._id,
            date:    today,
            level:   2,
          });

          if (!alreadyPaid) {
            await creditUserWallet(
              l2User._id,
              l2User.wallet._id,
              l2Amount,
              'gift_reward',
              `Level 2 referral commission from ${investor.fullName} — ₹${l2Amount} (${L2_RATE}% of ₹${dailyAmount})`,
              { depositId: deposit._id, fromUserId: investor._id, level: 2 },
            );

            await ReferralCommission.create({
              beneficiary:      l2User._id,
              fromUser:         investor._id,
              deposit:          deposit._id,
              level:            2,
              incomeAmount:     dailyAmount,
              commissionRate:   L2_RATE,
              commissionAmount: l2Amount,
              date:             today,
              paid:             true,
              paidAt:           new Date(),
            });

            await createNotification(
              l2User._id,
              'Referral Commission 🎁',
              `You earned ₹${l2Amount} Level-2 referral commission from ${investor.fullName}'s daily income.`,
              'general',
            );
          }
        }
      }

      // ── 4. Deactivate deposit if duration complete ────────
      const endDate = new Date(deposit.incomeEndDate);
      endDate.setHours(0, 0, 0, 0);
      if (today >= endDate || deposit.incomePaidDays >= deposit.plan?.durationDays) {
        deposit.incomeActive = false;
        await createNotification(
          investor._id,
          'Plan Completed 🏁',
          `Your plan has completed its income cycle of ${deposit.incomePaidDays} days. Total income earned!`,
          'general',
        );
      }

      await deposit.save();

    } catch (depositErr) {
      console.error(`[CRON] Error processing deposit ${deposit._id}:`, depositErr.message);
    }
  }

  console.log(`[CRON] Daily income job complete. Processed ${totalPaid} deposits.`);
}

// ── Schedule ──────────────────────────────────────────────────
// Runs every day at 00:01 AM server time
const startDailyIncomeCron = () => {
  cron.schedule('1 0 * * *', async () => {
    try {
      await runDailyIncome();
    } catch (err) {
      console.error('[CRON] Fatal error in daily income job:', err);
    }
  });
  console.log('[CRON] Daily income cron scheduled — runs at 00:01 daily');
};

// Export both so it can be triggered manually by admin if needed
module.exports = { startDailyIncomeCron, runDailyIncome };
