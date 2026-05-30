require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const connectDB  = require('./config/db');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/wallet',        require('./routes/wallet'));
app.use('/api/deposits',      require('./routes/deposit'));
app.use('/api/withdrawals',   require('./routes/withdrawal'));
app.use('/api/plans',         require('./routes/plan'));
app.use('/api/tasks',         require('./routes/task'));
app.use('/api/gift-codes',    require('./routes/giftCode'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api',               require('./routes/settings'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: process.env.APP_NAME, time: new Date() }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ${process.env.APP_NAME || 'WalletApp'} running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/health\n`);
});

module.exports = app;
