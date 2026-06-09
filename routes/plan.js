const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getPlans, getAllPlans, createPlan, updatePlan, deletePlan, togglePlan } = require('../controllers/planController');

router.get('/', protect, getPlans);               // active plans for users

router.get('/admin', protect, adminOnly, getAllPlans);
router.post('/admin', protect, adminOnly, createPlan);
router.put('/admin/:id', protect, adminOnly, updatePlan);
router.delete('/admin/:id', protect, adminOnly, deletePlan);
router.patch('/admin/:id/toggle', protect, adminOnly, togglePlan);

module.exports = router;
