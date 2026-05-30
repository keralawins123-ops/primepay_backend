const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllGiftCodes, createGiftCode, updateGiftCode, deleteGiftCode, toggleGiftCode, redeemGiftCode,
} = require('../controllers/giftCodeController');

// User
router.post('/redeem', protect, redeemGiftCode);

// Admin
router.get('/admin',              protect, adminOnly, getAllGiftCodes);
router.post('/admin',             protect, adminOnly, createGiftCode);
router.put('/admin/:id',          protect, adminOnly, updateGiftCode);
router.delete('/admin/:id',       protect, adminOnly, deleteGiftCode);
router.patch('/admin/:id/toggle', protect, adminOnly, toggleGiftCode);

module.exports = router;
