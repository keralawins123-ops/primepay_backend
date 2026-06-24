
require('dotenv').config();
const mongoose = require('mongoose');
const Deposit = require('./models/Deposit');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    
    // Find duplicate groups
    const duplicates = await Deposit.aggregate([
      {
        $group: {
          _id: { user: "$user", transactionRef: "$transactionRef" },
          count: { $sum: 1 },
          deposits: { $push: { _id: "$_id", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log('Found', duplicates.length, 'duplicate groups');
    
    // For each duplicate group, keep only the first one
    for (const group of duplicates) {
      // Sort deposits by createdAt ascending, keep first, delete rest
      const sortedDeposits = group.deposits.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const toDelete = sortedDeposits.slice(1);
      
      if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicates for user ${group._id.user}, transactionRef ${group._id.transactionRef}`);
        await Deposit.deleteMany({ _id: { $in: toDelete.map(d => d._id) } });
      }
    }
    
    console.log('Cleanup complete');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

connectDB();
