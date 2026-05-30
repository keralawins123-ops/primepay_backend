const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getWallet, getTransactions, adminAdjustWallet } = require('../controllers/walletController');

router.get('/',              protect, getWallet);
router.get('/transactions',  protect, getTransactions);
router.post('/admin/adjust', protect, adminOnly, adminAdjustWallet);

module.exports = router;
