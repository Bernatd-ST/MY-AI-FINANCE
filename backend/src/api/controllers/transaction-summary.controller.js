// filepath: /Users/bernatdsitumeang/Desktop/My-App/backend/src/api/controllers/transaction-summary.controller.js
const Transaction = require('../../models/Transaction.model');
const mongoose = require('mongoose');

async function getMonthlySummary(req, res) {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ success: false, message: 'Month is required (YYYY-MM)' });

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    // Ambil semua transaksi bulan itu
    const transactions = await Transaction.find({
      date: { $gte: start, $lt: end }
    });

    // Total pengeluaran
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Penerima terbanyak (total nominal)
    const receiverMap = {};
    transactions.forEach(t => {
      if (!t.receiver) return;
      receiverMap[t.receiver] = (receiverMap[t.receiver] || 0) + (t.amount || 0);
    });
    const topReceiver = Object.entries(receiverMap).sort((a, b) => b[1] - a[1])[0];

    // Tanggal transaksi terbanyak nominal
    const dateMap = {};
    transactions.forEach(t => {
      const d = t.date ? t.date.toISOString().slice(0, 10) : null;
      if (!d) return;
      dateMap[d] = (dateMap[d] || 0) + (t.amount || 0);
    });
    const topDate = Object.entries(dateMap).sort((a, b) => b[1] - a[1])[0];

    res.json({
      success: true,
      totalAmount,
      topReceiver: topReceiver ? { receiver: topReceiver[0], amount: topReceiver[1] } : null,
      topDate: topDate ? { date: topDate[0], amount: topDate[1] } : null,
      count: transactions.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getMonthlySummary };