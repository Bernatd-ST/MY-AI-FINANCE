const axios = require('axios');
const dayjs = require('dayjs');
const Transaction = require('../models/Transaction.model');
const EmailAccount = require('../models/EmailAccount.model');
const config = require('../config/config');

const TRANSACTION_LIMIT = 1500000; // Batas transaksi Rp 1.500.000
const NOTIFICATION_THRESHOLD_PERCENT = 0.8; // Notifikasi pada 80%

const telegramApi = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

// Fungsi untuk mengirim pesan tanpa mengganggu bot utama
async function sendTelegramMessage(chatId, text) {
  try {
    await axios.post(`${telegramApi}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error(`[NotificationService] Error sending message to ${chatId}:`, error.response ? error.response.data : error.message);
  }
}

async function checkTransactionLimit(email) {
  try {
    const user = await EmailAccount.findOne({ email });
    if (!user || !user.telegramChatId) {
      console.log(`[NotificationService] User or Telegram Chat ID not found for email: ${email}`);
      return;
    }

    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    const result = await Transaction.aggregate([
      { $match: { email: email, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalAmount : 0;
    const limitThreshold = TRANSACTION_LIMIT * NOTIFICATION_THRESHOLD_PERCENT;

    // Cek apakah notifikasi sudah pernah dikirim untuk threshold ini
    const alreadyNotifiedThreshold = user.notifications.sent.some(
      n => n.type === 'limit_threshold' && n.month === dayjs().format('YYYY-MM')
    );

    if (totalAmount >= limitThreshold && totalAmount < TRANSACTION_LIMIT && !alreadyNotifiedThreshold) {
      const message = `⚠️ <b>Peringatan Batas Transaksi</b> ⚠️\n\nTotal pengeluaran Anda bulan ini adalah <b>Rp${totalAmount.toLocaleString('id-ID')}</b>, sudah mencapai ${NOTIFICATION_THRESHOLD_PERCENT * 100}% dari batas Anda (Rp${TRANSACTION_LIMIT.toLocaleString('id-ID')}).`;
      await sendTelegramMessage(user.telegramChatId, message);
      
      // Tandai notifikasi telah dikirim
      user.notifications.sent.push({ type: 'limit_threshold', month: dayjs().format('YYYY-MM') });
      await user.save();
    }

    // Cek untuk notifikasi melebihi batas
    const alreadyNotifiedExceeded = user.notifications.sent.some(
      n => n.type === 'limit_exceeded' && n.month === dayjs().format('YYYY-MM')
    );

    if (totalAmount >= TRANSACTION_LIMIT && !alreadyNotifiedExceeded) {
      const message = `🚨 <b>Batas Transaksi Terlampaui!</b> 🚨\n\nTotal pengeluaran Anda bulan ini adalah <b>Rp${totalAmount.toLocaleString('id-ID')}</b>, telah melebihi batas maksimum Anda (Rp${TRANSACTION_LIMIT.toLocaleString('id-ID')}). Harap kelola pengeluaran Anda.`;
      await sendTelegramMessage(user.telegramChatId, message);

      // Tandai notifikasi telah dikirim
      user.notifications.sent.push({ type: 'limit_exceeded', month: dayjs().format('YYYY-MM') });
      await user.save();
    }

  } catch (error) {
    console.error(`[NotificationService] Error checking limit for ${email}:`, error);
  }
}

module.exports = { checkTransactionLimit };
