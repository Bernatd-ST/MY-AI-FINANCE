const express = require('express');
const router = express.Router();
const EmailScraper = require('../../scraper/emailScraper.js');
const config = require('../../config/config');
const Transaction = require('../../models/Transaction.model.js');
const { getMonthlySummary } = require('../controllers/transaction-summary.controller');
const { generateExcelReport } = require('../controllers/transaction-report.controller.js');

router.post('/fetch', async (req, res) => {
  try {
    const scraper = new EmailScraper({
      user: config.EMAIL_USER,
      password: config.EMAIL_PASSWORD
    });
    
    const emails = await scraper.scrapeQRISEmails();
    res.json({ success: true, count: emails.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .limit(50);
      
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary', getMonthlySummary);

router.get('/report/excel', generateExcelReport);

module.exports = router;