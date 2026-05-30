# WalletApp — Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. AUTH ROUTES  `/api/auth`

### Register
```
POST /api/auth/register
Body (JSON): { fullName, phoneNumber, email, password }
```

### Verify Email
```
GET /api/auth/verify-email/:token
```

### Send OTP (Login)
```
POST /api/auth/send-otp
Body: { emailOrPhone }
```

### Verify OTP (Get Token)
```
POST /api/auth/verify-otp
Body: { emailOrPhone, otp }
Response: { token, user }
```

### Get My Profile
```
GET /api/auth/me                  [protected]
```

### Update Profile
```
PUT /api/auth/update-profile      [protected]
Body: { fullName?, phoneNumber? }
```

---

## 2. WALLET  `/api/wallet`

### Get My Wallet
```
GET /api/wallet                   [protected]
```

### Get My Transaction History
```
GET /api/wallet/transactions      [protected]
Query: ?page=1&limit=10
```

### Admin: Adjust Wallet
```
POST /api/wallet/admin/adjust     [admin]
Body: { userId, amount, type: "credit"|"debit", description }
```

---

## 3. DEPOSITS  `/api/deposits`

### Submit Deposit
```
POST /api/deposits                [protected]
Content-Type: multipart/form-data
Body: { planId?, amount, transactionRef, paymentProof (file) }
```

### My Deposit History
```
GET /api/deposits                 [protected]
Query: ?page=1&limit=10
```

### Admin: All Deposits
```
GET /api/deposits/admin           [admin]
Query: ?status=pending|approved|rejected&page=1&limit=10
```

### Admin: Approve Deposit
```
PUT /api/deposits/admin/:id/approve  [admin]
```

### Admin: Reject Deposit
```
PUT /api/deposits/admin/:id/reject   [admin]
Body: { reason? }
```

---

## 4. WITHDRAWALS  `/api/withdrawals`

### Submit Withdrawal
```
POST /api/withdrawals             [protected]
Body: {
  amount,
  bankDetails: { accountHolderName, bankName, accountNumber, ifscCode, upiId? }
}
```

### My Withdrawal History
```
GET /api/withdrawals              [protected]
```

### Admin: All Withdrawals
```
GET /api/withdrawals/admin        [admin]
Query: ?status=pending|approved|rejected
```

### Admin: Approve Withdrawal
```
PUT /api/withdrawals/admin/:id/approve  [admin]
```

### Admin: Reject Withdrawal
```
PUT /api/withdrawals/admin/:id/reject   [admin]
Body: { reason? }
```

---

## 5. PLANS  `/api/plans`

### Get Active Plans (User)
```
GET /api/plans                    [protected]
```

### Admin: All Plans
```
GET /api/plans/admin              [admin]
```

### Admin: Create Plan
```
POST /api/plans/admin             [admin]
Body: { name, amount, description? }
```

### Admin: Update Plan
```
PUT /api/plans/admin/:id          [admin]
Body: { name?, amount?, description? }
```

### Admin: Delete Plan
```
DELETE /api/plans/admin/:id       [admin]
```

### Admin: Toggle Plan
```
PATCH /api/plans/admin/:id/toggle [admin]
```

---

## 6. TASKS  `/api/tasks`

### Get Active Tasks (User)
```
GET /api/tasks                    [protected]
```

### Submit Task
```
POST /api/tasks/:id/submit        [protected]
Content-Type: multipart/form-data
Body: { proof (file) }
```

### My Task Submissions
```
GET /api/tasks/submissions        [protected]
```

### Admin: All Tasks
```
GET /api/tasks/admin              [admin]
```

### Admin: Create Task
```
POST /api/tasks/admin             [admin]
Body: { title, description, rewardAmount }
```

### Admin: Update Task
```
PUT /api/tasks/admin/:id          [admin]
```

### Admin: Delete Task
```
DELETE /api/tasks/admin/:id       [admin]
```

### Admin: Toggle Task
```
PATCH /api/tasks/admin/:id/toggle [admin]
```

### Admin: All Submissions
```
GET /api/tasks/admin/submissions  [admin]
Query: ?status=pending|approved|rejected
```

### Admin: Approve Submission
```
PUT /api/tasks/admin/submissions/:id/approve  [admin]
```

### Admin: Reject Submission
```
PUT /api/tasks/admin/submissions/:id/reject   [admin]
Body: { reason? }
```

---

## 7. GIFT CODES  `/api/gift-codes`

### Redeem Gift Code (User)
```
POST /api/gift-codes/redeem       [protected]
Body: { code }
```

### Admin: All Gift Codes
```
GET /api/gift-codes/admin         [admin]
```

### Admin: Create Gift Code
```
POST /api/gift-codes/admin        [admin]
Body: { code, rewardAmount, maxUsers, expiryDate }
```

### Admin: Update Gift Code
```
PUT /api/gift-codes/admin/:id     [admin]
```

### Admin: Delete Gift Code
```
DELETE /api/gift-codes/admin/:id  [admin]
```

### Admin: Toggle Gift Code
```
PATCH /api/gift-codes/admin/:id/toggle  [admin]
```

---

## 8. APP SETTINGS

### Get Public Settings (App Init)
```
GET /api/app/settings             [public]
```

### Get Payment Methods (User)
```
GET /api/payment-methods          [protected]
```

### Get Active Contacts (User)
```
GET /api/contacts                 [protected]
```

### Admin: Get All Settings
```
GET /api/admin/settings           [admin]
```

### Admin: Update Maintenance
```
PUT /api/admin/settings/maintenance  [admin]
Body: { maintenanceMode: true|false, maintenanceMessage? }
```

### Admin: Update App Control
```
PUT /api/admin/settings/update-control  [admin]
Body: { forceUpdate: true|false, updateMessage?, currentVersion? }
```

### Admin: Update Payment Methods
```
PUT /api/admin/settings/payment   [admin]
Content-Type: multipart/form-data
Body: { qrCode: { enabled }, bankAccount: { enabled, accountHolder, bankName, accountNumber, ifscCode, upiId }, qrImage? (file) }
```

### Admin: Add Contact
```
POST /api/admin/contacts          [admin]
Body: { type: whatsapp|telegram|email|phone|website|support, label, value }
```

### Admin: Update Contact
```
PUT /api/admin/contacts/:contactId  [admin]
```

### Admin: Delete Contact
```
DELETE /api/admin/contacts/:contactId  [admin]
```

---

## 9. NOTIFICATIONS  `/api/notifications`

### Get My Notifications
```
GET /api/notifications            [protected]
Query: ?page=1&limit=10
```

### Get Unread Count
```
GET /api/notifications/unread-count  [protected]
```

### Mark One as Read
```
PATCH /api/notifications/:id/read    [protected]
```

### Mark All as Read
```
PATCH /api/notifications/read-all    [protected]
```

---

## 10. ADMIN  `/api/admin`

### Dashboard Stats
```
GET /api/admin/dashboard          [admin]
Response: { totalUsers, activeUsers, totalDeposits, totalWithdrawals,
            pendingDeposits, pendingWithdrawals, totalWalletBalance,
            totalPlans, totalGiftCodes, taskStats }
```

### All Users
```
GET /api/admin/users              [admin]
Query: ?search=&status=active|inactive|blocked&page=1&limit=10
```

### User Detail + History
```
GET /api/admin/users/:id          [admin]
```

### Block User
```
PATCH /api/admin/users/:id/block  [admin]
```

### Unblock User
```
PATCH /api/admin/users/:id/unblock  [admin]
```

### Activate User
```
PATCH /api/admin/users/:id/activate  [admin]
```

### Deactivate User
```
PATCH /api/admin/users/:id/deactivate  [admin]
```

---

## Standard Response Format
```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## Pagination Response
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": { "total": 100, "page": 1, "limit": 10, "pages": 10 }
  }
}
```
