const mongoose = require('mongoose');
const config = require('../config/config');

async function connectDB() {
    try {
        await mongoose.connect(config.MONGODB_URI); // cukup satu kali, tanpa opsi deprecated
        console.log('MongoDB connected');
    } catch (error) {
        console.log('Database connection failed:', error);
        process.exit(1);
    }
}

module.exports = connectDB;
