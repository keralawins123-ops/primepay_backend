const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getDashboard, getUsers, getUserDetail,
  blockUser, unblockUser, activateUser, deactivateUser,
} = require('../controllers/adminController');

router.get('/dashboard',            protect, adminOnly, getDashboard);
router.get('/users',                protect, adminOnly, getUsers);
router.get('/users/:id',            protect, adminOnly, getUserDetail);
router.patch('/users/:id/block',    protect, adminOnly, blockUser);
router.patch('/users/:id/unblock',  protect, adminOnly, unblockUser);
router.patch('/users/:id/activate', protect, adminOnly, activateUser);
router.patch('/users/:id/deactivate', protect, adminOnly, deactivateUser);

module.exports = router;
