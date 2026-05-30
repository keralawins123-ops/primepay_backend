const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createWithdrawal, getUserWithdrawals, getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
} = require('../controllers/withdrawalController');

router.post('/', protect, createWithdrawal);
router.get('/',  protect, getUserWithdrawals);

router.get('/admin',             protect, adminOnly, getAllWithdrawals);
router.put('/admin/:id/approve', protect, adminOnly, approveWithdrawal);
router.put('/admin/:id/reject',  protect, adminOnly, rejectWithdrawal);

module.exports = router;
