const crypto = require('crypto');

// Generate random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};



const generateUserId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};



// Standard API response helpers
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Paginate query results
const paginate = async (Model, query = {}, options = {}) => {
  const page  = parseInt(options.page)  || 1;
  const limit = parseInt(options.limit) || 10;
  const skip  = (page - 1) * limit;
  const sort  = options.sort || { createdAt: -1 };

  const [data, total] = await Promise.all([
    Model.find(query).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Credit wallet helper
const creditWallet = async (Wallet, Transaction, userId, walletId, amount, type, description, meta = {}) => {
  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw new Error('Wallet not found');

  const balanceBefore = wallet.balance;
  wallet.balance      += amount;
  wallet.totalCredited += amount;
  await wallet.save();

  const txn = await Transaction.create({
    user:          userId,
    wallet:        walletId,
    type,
    amount,
    balanceBefore,
    balanceAfter:  wallet.balance,
    status:        'completed',
    description,
    meta,
  });

  return { wallet, transaction: txn };
};

// Debit wallet helper
const debitWallet = async (Wallet, Transaction, userId, walletId, amount, type, description, meta = {}) => {
  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance < amount) throw new Error('Insufficient balance');

  const balanceBefore = wallet.balance;
  wallet.balance      -= amount;
  wallet.totalDebited += amount;
  await wallet.save();

  const txn = await Transaction.create({
    user:          userId,
    wallet:        walletId,
    type,
    amount:        -amount,
    balanceBefore,
    balanceAfter:  wallet.balance,
    status:        'completed',
    description,
    meta,
  });

  return { wallet, transaction: txn };
};

module.exports = {
  generateToken,
  generateOTP,
  successResponse,
  errorResponse,
  paginate,
  creditWallet,
  debitWallet,
  generateReferralCode,
  generateUserId
};
