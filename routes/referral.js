const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getMyTeam, getMyCommissions, getReferralStats,
  adminGetCommissions, adminRunIncome,
  getTeamDeposits,
} = require('../controllers/referralController');

// User routes
router.get('/my-team',      protect, getMyTeam);
router.get('/commissions',  protect, getMyCommissions);
router.get('/stats',        protect, getReferralStats);
router.get('/team-deposits',   protect, getTeamDeposits);  // NEW ← Shows deposits from L1 + L2


// Admin routes
router.get('/admin/commissions',  protect, adminOnly, adminGetCommissions);
router.post('/admin/run-income',  protect, adminOnly, adminRunIncome);

module.exports = router;
