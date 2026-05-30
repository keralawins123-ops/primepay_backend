const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const upload  = require('../utils/upload');
const {
  createDeposit, getUserDeposits, getAllDeposits, approveDeposit, rejectDeposit,
} = require('../controllers/depositController');

// User routes
router.post('/', protect, (req, res, next) => { req.uploadType = 'proof'; next(); }, upload.single('paymentProof'), createDeposit);
router.get('/',  protect, getUserDeposits);

// Admin routes
router.get('/admin',               protect, adminOnly, getAllDeposits);
router.put('/admin/:id/approve',   protect, adminOnly, approveDeposit);
router.put('/admin/:id/reject',    protect, adminOnly, rejectDeposit);

module.exports = router;
