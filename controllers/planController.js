const Plan = require('../models/Plan');
const { successResponse, errorResponse } = require('../utils/helpers');

// GET /api/plans  (public for users — active only)
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ createdAt: -1 });
    return successResponse(res, plans);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/plans  (all)
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    return successResponse(res, plans);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/admin/plans
exports.createPlan = async (req, res) => {
  try {
    const { name, amount, description, incomeOnApproval } = req.body;
    const plan = await Plan.create({ name, amount, description, incomeOnApproval });
    return successResponse(res, plan, 'Plan created.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/plans/:id
exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return errorResponse(res, 'Plan not found.', 404);
    return successResponse(res, plan, 'Plan updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// DELETE /api/admin/plans/:id
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return errorResponse(res, 'Plan not found.', 404);
    return successResponse(res, null, 'Plan deleted.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/plans/:id/toggle
exports.togglePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return errorResponse(res, 'Plan not found.', 404);
    plan.isActive = !plan.isActive;
    await plan.save();
    return successResponse(res, { isActive: plan.isActive }, `Plan ${plan.isActive ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
