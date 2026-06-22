const AppSettings = require('../models/AppSettings');
const AdminPaymentMethod = require('../models/AdminPaymentMethod');
const { successResponse, errorResponse } = require('../utils/helpers');

const getOrCreate = async () => {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
  return settings;
};

// GET /api/app/settings  (public — returns minimal info for app init)
exports.getPublicSettings = async (req, res) => {
  try {
    const s = await getOrCreate();
    return successResponse(res, {
      maintenanceMode:    s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      forceUpdate:        s.forceUpdate,
      updateMessage:      s.updateMessage,
      currentVersion:     s.currentVersion,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/settings
exports.getSettings = async (req, res) => {
  try {
    const s = await getOrCreate();
    return successResponse(res, s);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/settings/maintenance
exports.updateMaintenance = async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    const s = await getOrCreate();
    if (maintenanceMode !== undefined) s.maintenanceMode    = maintenanceMode;
    if (maintenanceMessage)            s.maintenanceMessage = maintenanceMessage;
    await s.save();
    return successResponse(res, { maintenanceMode: s.maintenanceMode, maintenanceMessage: s.maintenanceMessage }, 'Maintenance settings updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/settings/update-control
exports.updateAppControl = async (req, res) => {
  try {
    const { forceUpdate, updateMessage, currentVersion } = req.body;
    const s = await getOrCreate();
    if (forceUpdate !== undefined) s.forceUpdate     = forceUpdate;
    if (updateMessage)             s.updateMessage   = updateMessage;
    if (currentVersion)            s.currentVersion  = currentVersion;
    await s.save();
    return successResponse(res, { forceUpdate: s.forceUpdate, currentVersion: s.currentVersion }, 'Update settings saved.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/settings/payment  (body: { qrCode: {...}, bankAccount: {...} })
exports.updatePaymentMethods = async (req, res) => {
  try {
    const { qrCode, bankAccount } = req.body;
    const s = await getOrCreate();

    if (qrCode) {
      if (qrCode.enabled !== undefined) s.paymentMethods.qrCode.enabled = qrCode.enabled;
      if (req.file)                     s.paymentMethods.qrCode.imageUrl = req.file.path;
    }
    if (bankAccount) {
      Object.assign(s.paymentMethods.bankAccount, bankAccount);
    }
    s.markModified('paymentMethods');
    await s.save();
    return successResponse(res, s.paymentMethods, 'Payment methods updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};



 // ════════════════════════════════════════════════════════════════
// PAYMENT METHODS (User View)
// ════════════════════════════════════════════════════════════════

// GET /api/payment-methods  (user view — what they see during deposit/withdrawal)
exports.getPaymentMethods = async (req, res) => {
  try {
    const s = await getOrCreate();
    const response = {
      upiEnabled:  s.paymentMethods.upiEnabled,
      bankEnabled: s.paymentMethods.bankEnabled,
    };

    // Get ONE active UPI if UPI is enabled
    if (s.paymentMethods.upiEnabled) {
      const upiMethods = await AdminPaymentMethod.find({ type: 'upi', isActive: true });
      if (upiMethods.length > 0) {
        // Round-robin: pick random to show different UPI each time
        const idx = Math.floor(Math.random() * upiMethods.length);
        response.upi = {
          upiId:     upiMethods[idx].upiId,
          payeeName: upiMethods[idx].upiPayeeName,
        };
      }
    }

    // Get ONE active Bank account if Bank is enabled
    if (s.paymentMethods.bankEnabled) {
      const bankMethods = await AdminPaymentMethod.find({ type: 'bank', isActive: true });
      if (bankMethods.length > 0) {
        const idx = Math.floor(Math.random() * bankMethods.length);
        response.bank = {
          accountHolderName: bankMethods[idx].accountHolderName,
          bankName:          bankMethods[idx].bankName,
          accountNumber:     bankMethods[idx].accountNumber,
          ifscCode:          bankMethods[idx].ifscCode,
        };
      }
    }

    return successResponse(res, response);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};





// Contacts
// GET /api/contacts
exports.getContacts = async (req, res) => {
  try {
    const s       = await getOrCreate();
    const active  = s.contacts.filter(c => c.isActive);
    return successResponse(res, active);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// POST /api/admin/contacts
exports.addContact = async (req, res) => {
  try {
    const { type, label, value } = req.body;
    const s = await getOrCreate();
    s.contacts.push({ type, label, value });
    await s.save();
    return successResponse(res, s.contacts, 'Contact added.', 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/contacts/:contactId
exports.updateContact = async (req, res) => {
  try {
    const s       = await getOrCreate();
    const contact = s.contacts.id(req.params.contactId);
    if (!contact) return errorResponse(res, 'Contact not found.', 404);
    Object.assign(contact, req.body);
    await s.save();
    return successResponse(res, contact, 'Contact updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// DELETE /api/admin/contacts/:contactId
exports.deleteContact = async (req, res) => {
  try {
    const s       = await getOrCreate();
    const contact = s.contacts.id(req.params.contactId);
    if (!contact) return errorResponse(res, 'Contact not found.', 404);
    contact.deleteOne();
    await s.save();
    return successResponse(res, null, 'Contact deleted.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
