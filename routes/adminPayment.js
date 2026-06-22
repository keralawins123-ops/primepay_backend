const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
  enablePaymentType,
  getPaymentStatus,
  getActivePaymentMethod,
} = require('../controllers/adminPaymentController');

// User routes (public)
router.get('/payment-methods', getActivePaymentMethod);  // What user sees

// Admin routes
router.post('/admin/payment-methods',         protect, adminOnly, addPaymentMethod);
router.get('/admin/payment-methods',          protect, adminOnly, getPaymentMethods);
router.put('/admin/payment-methods/enable',   protect, adminOnly, enablePaymentType);
router.put('/admin/payment-methods/:id',      protect, adminOnly, updatePaymentMethod);
router.delete('/admin/payment-methods/:id',   protect, adminOnly, deletePaymentMethod);
 router.get('/admin/payment-methods/status',   protect, adminOnly, getPaymentStatus);

module.exports = router;
