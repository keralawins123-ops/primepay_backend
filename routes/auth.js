const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register, sendOtp, verifyOtp, getMe, updateProfile,
} = require('../controllers/authController');

router.post('/register', register);
// router.get('/verify-email/:token', verifyEmail);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);

module.exports = router;
