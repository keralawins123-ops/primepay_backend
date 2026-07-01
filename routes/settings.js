const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../utils/upload');
const {
  getPublicSettings, getSettings, updateMaintenance, updateAppControl,
  updatePaymentMethods, getPaymentMethods,  addContact, updateContact, deleteContact,
  getContacts,
} = require('../controllers/settingsController');

const {
    getAppUpdate,
    updateAppUpdate,
} = require("../controllers/appUpdateController");

// Public
router.get('/app/settings', getPublicSettings);
router.get('/payment-methods', protect, getPaymentMethods);
router.get('/contacts', protect, getContacts);
router.get("/app/update", getAppUpdate);


// Admin
router.get('/admin/settings', protect, adminOnly, getSettings);
router.put('/admin/settings/maintenance', protect, adminOnly, updateMaintenance);
router.put('/admin/settings/update-control', protect, adminOnly, updateAppControl);
router.put('/admin/settings/payment', protect, adminOnly, (req, res, next) => { req.uploadType = 'qr'; next(); }, upload.single('qrImage'), updatePaymentMethods);

router.post('/admin/contacts', protect, adminOnly, addContact);
router.put('/admin/contacts/:contactId', protect, adminOnly, updateContact);
router.delete('/admin/contacts/:contactId', protect, adminOnly, deleteContact);

router.put(
  "/admin/app-update",
  protect,
  adminOnly,
  updateAppUpdate
);
module.exports = router;
