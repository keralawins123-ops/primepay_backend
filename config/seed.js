const mongoose    = require('mongoose');
const User        = require('../models/User');
const Wallet      = require('../models/Wallet');
const Plan        = require('../models/Plan');
const AppSettings = require('../models/AppSettings');
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Admin
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existingAdmin) {
    const admin = await User.create({
      fullName:        'Super Admin',
      phoneNumber:     '0000000000',
      email:           process.env.ADMIN_EMAIL,
      password:        process.env.ADMIN_PASSWORD,
      role:            'admin',
      isEmailVerified: true,
      isActive:        true,
    });
    const wallet    = await Wallet.create({ user: admin._id });
    admin.wallet    = wallet._id;
    await admin.save({ validateBeforeSave: false });
    console.log('✅ Admin created:', process.env.ADMIN_EMAIL);
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Default plans
  const plansCount = await Plan.countDocuments();
  if (plansCount === 0) {
    await Plan.insertMany([
      { name: 'Starter Plan',    amount: 1500,  description: 'Basic investment plan' },
      { name: 'Growth Plan',     amount: 4000,  description: 'Medium investment plan' },
      { name: 'Premium Plan',    amount: 10000, description: 'High-yield investment plan' },
    ]);
    console.log('✅ Default plans created');
  }

  // App settings
  const settingsCount = await AppSettings.countDocuments();
  if (settingsCount === 0) {
    await AppSettings.create({});
    console.log('✅ App settings initialized');
  }

  await mongoose.disconnect();
  console.log('Seeding complete!');
};

seed().catch(err => { console.error(err); process.exit(1); });
