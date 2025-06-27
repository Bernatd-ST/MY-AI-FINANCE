const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  emailId: { type: String, unique: true },
  email: { type: String }, // <-- sudah benar, field penghubung user
  receiver: String,
  date: Date,
  amount: Number,
  rawText: String
});

module.exports = mongoose.model('Transaction', TransactionSchema);