const { Task, TaskSubmission } = require('../models/Task');
const Wallet      = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { successResponse, errorResponse, paginate, creditWallet } = require('../utils/helpers');
const { createNotification, notifyAdmins }                       = require('../utils/notifications');
const { sendEmail, emailTemplates }                              = require('../utils/email');

// GET /api/tasks  (active tasks for users)
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ isActive: true }).sort({ createdAt: -1 });
    return successResponse(res, tasks);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/tasks
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return successResponse(res, tasks);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/admin/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, rewardAmount } = req.body;
    const task = await Task.create({ title, description, rewardAmount });
    return successResponse(res, task, 'Task created.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return errorResponse(res, 'Task not found.', 404);
    return successResponse(res, task, 'Task updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// DELETE /api/admin/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return errorResponse(res, 'Task not found.', 404);
    return successResponse(res, null, 'Task deleted.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PATCH /api/admin/tasks/:id/toggle
exports.toggleTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return errorResponse(res, 'Task not found.', 404);
    task.isActive = !task.isActive;
    await task.save();
    return successResponse(res, { isActive: task.isActive }, `Task ${task.isActive ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/tasks/:id/submit  (multipart/form-data)
exports.submitTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.isActive) return errorResponse(res, 'Task not found or inactive.', 404);

    if (!req.file) return errorResponse(res, 'Proof file is required.', 400);

    // Prevent duplicate submission
    const existing = await TaskSubmission.findOne({ user: req.user._id, task: task._id, status: { $in: ['pending', 'approved'] } });
    if (existing) return errorResponse(res, 'You have already submitted or been approved for this task.', 409);

    const submission = await TaskSubmission.create({
      user:  req.user._id,
      task:  task._id,
      proof: req.file.path,
    });

    const User = require('../models/User');
    await notifyAdmins(User, require('../models/Notification'), 'New Task Submission', `${req.user.fullName} submitted task: ${task.title}.`, 'admin_alert');

    return successResponse(res, { submissionId: submission._id }, 'Task submitted. Awaiting review.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/tasks/submissions  (user's own)
exports.getUserSubmissions = async (req, res) => {
  try {
    const result = await paginate(
      TaskSubmission,
      { user: req.user._id },
      { ...req.query, sort: { createdAt: -1 } }
    );
    // Populate task info
    await TaskSubmission.populate(result.data, { path: 'task', select: 'title rewardAmount' });
    return successResponse(res, result);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/tasks/submissions
exports.getAllSubmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter     = status ? { status } : {};
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      TaskSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'fullName email')
        .populate('task', 'title rewardAmount'),
      TaskSubmission.countDocuments(filter),
    ]);
    return successResponse(res, { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/tasks/submissions/:id/approve
exports.approveSubmission = async (req, res) => {
  try {
    const submission = await TaskSubmission.findById(req.params.id)
      .populate({ path: 'user', populate: { path: 'wallet' } })
      .populate('task');

    if (!submission)                    return errorResponse(res, 'Submission not found.', 404);
    if (submission.status !== 'pending') return errorResponse(res, 'Already processed.', 400);

    submission.status     = 'approved';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    // Credit wallet with task reward
    const user = submission.user;
    await creditWallet(Wallet, Transaction, user._id, user.wallet._id, submission.task.rewardAmount, 'task_reward', `Task reward: ${submission.task.title}`);

    await createNotification(user._id, 'Task Approved!', `Your submission for "${submission.task.title}" was approved. ₹${submission.task.rewardAmount} credited!`, 'task_approved');
    try {
      const tmpl = emailTemplates.taskApproved(user.fullName, submission.task.title, submission.task.rewardAmount);
      await sendEmail({ to: user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Task approved and reward credited.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/tasks/submissions/:id/reject
exports.rejectSubmission = async (req, res) => {
  try {
    const { reason }  = req.body;
    const submission  = await TaskSubmission.findById(req.params.id)
      .populate('user', 'fullName email')
      .populate('task', 'title');

    if (!submission)                    return errorResponse(res, 'Submission not found.', 404);
    if (submission.status !== 'pending') return errorResponse(res, 'Already processed.', 400);

    submission.status     = 'rejected';
    submission.adminNote  = reason;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    await createNotification(submission.user._id, 'Task Rejected', `Your submission for "${submission.task.title}" was rejected. ${reason || ''}`, 'task_rejected');
    try {
      const tmpl = emailTemplates.taskRejected(submission.user.fullName, submission.task.title, reason);
      await sendEmail({ to: submission.user.email, ...tmpl });
    } catch (e) { /* non-fatal */ }

    return successResponse(res, null, 'Task submission rejected.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
