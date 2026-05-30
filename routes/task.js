const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const upload  = require('../utils/upload');
const {
  getTasks, getAllTasks, createTask, updateTask, deleteTask, toggleTask,
  submitTask, getUserSubmissions, getAllSubmissions, approveSubmission, rejectSubmission,
} = require('../controllers/taskController');

// User routes
router.get('/',              protect, getTasks);
router.post('/:id/submit',   protect, (req, res, next) => { req.uploadType = 'task'; next(); }, upload.single('proof'), submitTask);
router.get('/submissions',   protect, getUserSubmissions);

// Admin routes
router.get('/admin',                         protect, adminOnly, getAllTasks);
router.post('/admin',                        protect, adminOnly, createTask);
router.put('/admin/:id',                     protect, adminOnly, updateTask);
router.delete('/admin/:id',                  protect, adminOnly, deleteTask);
router.patch('/admin/:id/toggle',            protect, adminOnly, toggleTask);
router.get('/admin/submissions',             protect, adminOnly, getAllSubmissions);
router.put('/admin/submissions/:id/approve', protect, adminOnly, approveSubmission);
router.put('/admin/submissions/:id/reject',  protect, adminOnly, rejectSubmission);

module.exports = router;
