# WalletApp Backend

A complete Node.js/Express/MongoDB REST API for a wallet, task, and investment management application.

## Features

- ✅ User registration with email verification
- ✅ OTP-based login
- ✅ JWT authentication
- ✅ Wallet system (auto-created, credit/debit tracking)
- ✅ Deposit system with payment proof upload & admin approval
- ✅ Withdrawal system with auto wallet hold & refund on rejection
- ✅ Investment plans management
- ✅ Task system with proof upload & reward on approval
- ✅ Gift code system (limit, expiry, one-time-per-user)
- ✅ App settings (maintenance, force update, payment methods)
- ✅ Contact management (WhatsApp, Telegram, etc.)
- ✅ In-app notifications
- ✅ Admin dashboard with stats
- ✅ Full user management (block/unblock/activate)
- ✅ Email notifications for all key events
- ✅ File uploads (payment proofs, task proofs, QR codes)
- ✅ Pagination on all list endpoints

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + OTP
- **Email**: Nodemailer
- **File Upload**: Multer
- **Password Hash**: bcryptjs

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Seed database (creates admin + default plans)
```bash
node config/seed.js
```

### 4. Start server
```bash
# Development
npm run dev

# Production
npm start
```

## Default Admin
After seeding:
- **Email**: admin@walletapp.com (or as set in .env)
- **Password**: Admin@123456 (or as set in .env)

Login via:
```bash
# 1. Send OTP
POST /api/auth/send-otp
{ "emailOrPhone": "admin@walletapp.com" }

# 2. Verify OTP (check console/email for OTP)
POST /api/auth/verify-otp
{ "emailOrPhone": "admin@walletapp.com", "otp": "123456" }
```

## Project Structure
```
├── config/
│   ├── db.js            # MongoDB connection
│   └── seed.js          # Database seeder
├── controllers/
│   ├── authController.js
│   ├── walletController.js
│   ├── depositController.js
│   ├── withdrawalController.js
│   ├── planController.js
│   ├── taskController.js
│   ├── giftCodeController.js
│   ├── settingsController.js
│   ├── notificationController.js
│   └── adminController.js
├── middleware/
│   └── auth.js          # JWT protect + adminOnly
├── models/
│   ├── User.js
│   ├── Wallet.js
│   ├── Transaction.js
│   ├── Deposit.js
│   ├── Withdrawal.js
│   ├── Plan.js
│   ├── Task.js          # Task + TaskSubmission
│   ├── GiftCode.js
│   ├── Notification.js
│   └── AppSettings.js
├── routes/
│   ├── auth.js
│   ├── wallet.js
│   ├── deposit.js
│   ├── withdrawal.js
│   ├── plan.js
│   ├── task.js
│   ├── giftCode.js
│   ├── notification.js
│   ├── settings.js
│   └── admin.js
├── utils/
│   ├── email.js         # Email templates + sender
│   ├── helpers.js       # Tokens, OTP, response helpers, wallet ops
│   ├── notifications.js # In-app notification helpers
│   └── upload.js        # Multer config
├── uploads/             # File storage (auto-created)
├── server.js            # Entry point
├── .env.example
└── API_DOCS.md          # Full API reference
```

## See Also
- [API Documentation](./API_DOCS.md)
