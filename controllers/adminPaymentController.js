const AdminPaymentMethod = require('../models/AdminPaymentMethod');
const AppSettings        = require('../models/AppSettings');
const { successResponse, errorResponse } = require('../utils/helpers');

const getOrCreateSettings = async () => {
  let s = await AppSettings.findOne();
  if (!s) s = await AppSettings.create({});
  return s;
};

// ════════════════════════════════════════════════════════════════
// ADMIN PAYMENT METHOD MANAGEMENT
// ════════════════════════════════════════════════════════════════

// POST /api/admin/payment-methods  (add UPI or Bank account)
// Body: { type: 'upi'|'bank', upiId?, upiPayeeName?, accountHolderName?, bankName?, accountNumber?, ifscCode? }
exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, upiId, upiPayeeName, accountHolderName, bankName, accountNumber, ifscCode } = req.body;

    if (!type || !['upi', 'bank'].includes(type))
      return errorResponse(res, 'type must be "upi" or "bank".', 400);

    if (type === 'upi') {
      if (!upiId || !upiPayeeName)
        return errorResponse(res, 'upiId and upiPayeeName are required for UPI.', 400);

      // Check duplicate UPI
      const exists = await AdminPaymentMethod.findOne({ type: 'upi', upiId: upiId.toLowerCase() });
      if (exists) return errorResponse(res, 'This UPI ID is already added.', 409);
    }

    if (type === 'bank') {
      if (!accountHolderName || !bankName || !accountNumber || !ifscCode)
        return errorResponse(res, 'All bank account details are required.', 400);
    }

    const method = await AdminPaymentMethod.create({
      type,
      upiId:              upiId?.toLowerCase(),
      upiPayeeName,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
    });

    return successResponse(res, method, `${type === 'upi' ? 'UPI' : 'Bank'} payment method added.`, 201);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/payment-methods  (list all, filter by type)
// Query: ?type=upi|bank&isActive=true|false
exports.getPaymentMethods = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const methods = await AdminPaymentMethod.find(filter).sort({ createdAt: -1 });
    return successResponse(res, methods);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// PUT /api/admin/payment-methods/:id  (update details)
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { upiPayeeName, accountHolderName, bankName, accountNumber, ifscCode, isActive } = req.body;
    const method = await AdminPaymentMethod.findById(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);

    // Can only update name fields, not type or UPI ID
    if (method.type === 'upi' && upiPayeeName) method.upiPayeeName = upiPayeeName;
    if (method.type === 'bank') {
      if (accountHolderName) method.accountHolderName = accountHolderName;
      if (bankName)          method.bankName          = bankName;
      if (accountNumber)     method.accountNumber     = accountNumber;
      if (ifscCode)          method.ifscCode          = ifscCode;
    }
    if (isActive !== undefined) method.isActive = isActive;

    await method.save();
    return successResponse(res, method, 'Payment method updated.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// DELETE /api/admin/payment-methods/:id
exports.deletePaymentMethod = async (req, res) => {
  try {
    const method = await AdminPaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) return errorResponse(res, 'Payment method not found.', 404);
    return successResponse(res, null, 'Payment method deleted.');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// ════════════════════════════════════════════════════════════════
// PAYMENT METHOD ENABLE/DISABLE (AppSettings)
// ════════════════════════════════════════════════════════════════

// PUT /api/admin/payment-methods/enable-type  (enable/disable UPI or Bank)
// Body: { type: 'upi'|'bank', enabled: true|false }
exports.enablePaymentType = async (req, res) => {
  try {
    const { type, enabled } = req.body;

    if (!type || !['upi', 'bank'].includes(type))
      return errorResponse(res, 'type must be "upi" or "bank".', 400);

    const s = await getOrCreateSettings();

    if (type === 'upi') {
      s.paymentMethods.upiEnabled = enabled;
    } else if (type === 'bank') {
      s.paymentMethods.bankEnabled = enabled;
    }

    s.markModified('paymentMethods');
    await s.save();

    return successResponse(res, s.paymentMethods, `Payment method type ${type} ${enabled ? 'enabled' : 'disabled'}.`);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// GET /api/admin/payment-methods/status  (check which payment types are enabled)
exports.getPaymentStatus = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    return successResponse(res, {
      upiEnabled:  s.paymentMethods.upiEnabled,
      bankEnabled: s.paymentMethods.bankEnabled,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// ════════════════════════════════════════════════════════════════
// USER VIEW — Get ONE active admin payment method (rotates each time)
// ════════════════════════════════════════════════════════════════

// GET /api/payment-methods  (what user sees during deposit)
exports.getActivePaymentMethod = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    const response = { upiEnabled: s.paymentMethods.upiEnabled, bankEnabled: s.paymentMethods.bankEnabled };

    // Get ONE active UPI if UPI is enabled
    if (s.paymentMethods.upiEnabled) {
      const upiMethods = await AdminPaymentMethod.find({ type: 'upi', isActive: true });
      if (upiMethods.length > 0) {
        // Round-robin: pick random or use timestamp hash to vary
        const idx = Math.floor(Math.random() * upiMethods.length);
        response.upi = {
          upiId:       upiMethods[idx].upiId,
          payeeName:   upiMethods[idx].upiPayeeName,
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
