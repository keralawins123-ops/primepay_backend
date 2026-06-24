
require('dotenv').config();
const mongoose = require('mongoose');
const Deposit = require('./models/Deposit');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    
    // Check for duplicate deposits
    const deposits = await Deposit.aggregate([
      {
        $group: {
          _id: { user: "$user", transactionRef: "$transactionRef" },
          count: { $sum: 1 },
          deposits: { $push: "$_id" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log('Duplicate deposits:', deposits);
    
    // Also check all deposits for a user
    const recentDeposits = await Deposit.find().sort({ createdAt: -1 }).limit(20);
    console.log('Recent deposits:', recentDeposits.map(d => ({ id: d._id, user: d.user, transactionRef: d.transactionRef, createdAt: d.createdAt })));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

connectDB();
