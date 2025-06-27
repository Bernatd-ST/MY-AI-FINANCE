const mongoose = require('mongoose');

const EmailAccountSchema = new mongoose.Schema({
  email: { type: String, required: true },
  appPassword: { type: String, required: true },
  telegramChatId: { type: String, required: false }, // Opsional, bisa diisi nanti
  notifications: {
    sent: [
      {
        type: { type: String, enum: ['limit_threshold', 'limit_exceeded'] },
        month: { type: String }, // Format YYYY-MM
        sentAt: { type: Date, default: Date.now },
      },
    ],
  },
});

module.exports = mongoose.model('EmailAccount', EmailAccountSchema);