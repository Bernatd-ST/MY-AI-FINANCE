const express = require('express');
const connectDB = require('../utils/db');
const transactionRoutes = require('./routes/transaction-routes.js');
const emailAccountRoutes = require('./routes/email-account-routes.js');
const config = require('../config/config');
const { startEmailScheduler } = require('../utils/scheduler');
const path = require('path');
//const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));
//app.use(cors());

// Database
connectDB();

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/email-accounts', emailAccountRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

startEmailScheduler();

module.exports = app;