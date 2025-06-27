const cron = require('node-cron');
const EmailAccount = require('../models/EmailAccount.model');
const EmailScraper = require('../scraper/emailScraper');

async function scrapeAllAccounts() {
  const accounts = await EmailAccount.find();
  for (const acc of accounts) {
    const scraper = new EmailScraper({
      user: acc.email,
      password: acc.appPassword,
      // host, port, tls jika perlu
    });
    // Pastikan sendTelegramMessage di emailScraper.js pakai acc.telegramChatId
    await scraper.scrapeQRISEmails(acc.telegramChatId);
  }
}

function startEmailScheduler() {
  // Setiap 1 menit
  cron.schedule('*/1 * * * *', async () => {
    try {
      await scrapeAllAccounts();
      console.log('Email QRIS checked by scheduler (multi-account)');
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
}

module.exports = { startEmailScheduler };