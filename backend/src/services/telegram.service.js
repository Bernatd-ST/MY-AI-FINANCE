const axios = require('axios');
const config = require('../config/config');

async function sendTelegramMessage(message, chatId) {
  const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  });
}

module.exports = { sendTelegramMessage };