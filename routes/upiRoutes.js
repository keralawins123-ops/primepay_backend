// routes/upiRoutes.js

const express = require('express');
const router = express.Router();

const upiController = require('../controllers/upiController');
  

const { protect, adminOnly } = require('../middleware/auth');



// User
router.post('/', protect, upiController.addUpiAccount);

router.get('/my', protect, upiController.getMyUpiAccounts);

router.put('/:id', protect, upiController.updateUpiAccount);

router.delete('/:id', protect, upiController.deleteUpiAccount);

router.patch(
  '/:id/primary',
  protect,
  upiController.setPrimaryUpi
);

// Admin
router.get(
  '/admin/all',
  protect,
  adminOnly,
  upiController.getAllUpiAccounts
);

module.exports = router;