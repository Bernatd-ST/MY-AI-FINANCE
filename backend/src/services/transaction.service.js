const Transaction = require('../models/Transaction.model');
const dayjs = require('dayjs');

/**
 * Lakukan query transaksi dengan filter dinamis.
 * @param {string} email - Email user.
 * @param {object} filters - Objek filter.
 * @param {string} [filters.merchant] - Nama merchant (case-insensitive regex).
 * @param {string} [filters.startDate] - Tanggal mulai (YYYY-MM-DD).
 * @param {string} [filters.endDate] - Tanggal akhir (YYYY-MM-DD).
 * @returns {Promise<Array>} - Daftar transaksi.
 */
async function getTransactions(email, filters = {}) {
  const query = { email };

  if (filters.merchant) {
    query.receiver = { $regex: filters.merchant, $options: 'i' };
  }

  const dateFilter = {};
  if (filters.startDate) {
    dateFilter.$gte = dayjs(filters.startDate).startOf('day').toDate();
  }
  if (filters.endDate) {
    dateFilter.$lte = dayjs(filters.endDate).endOf('day').toDate();
  }

  if (Object.keys(dateFilter).length > 0) {
    query.date = dateFilter;
  }

  console.log('[TransactionService] Executing query:', JSON.stringify(query, null, 2));
  return Transaction.find(query).sort({ date: -1 }).limit(100).lean();
}

/**
 * Hitung total pengeluaran dengan filter dinamis.
 * @param {string} email - Email user.
 * @param {object} filters - Objek filter.
 * @returns {Promise<number>} - Total pengeluaran.
 */
async function getTotalSpending(email, filters = {}) {
    const query = { email };

    if (filters.merchant) {
        query.receiver = { $regex: filters.merchant, $options: 'i' };
    }

    const dateFilter = {};
    if (filters.startDate) {
        dateFilter.$gte = dayjs(filters.startDate).startOf('day').toDate();
    }
    if (filters.endDate) {
        dateFilter.$lte = dayjs(filters.endDate).endOf('day').toDate();
    }

    if (Object.keys(dateFilter).length > 0) {
        query.date = dateFilter;
    }

    const result = await Transaction.aggregate([
        { $match: query },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);

    console.log('[TransactionService] Executing aggregation for total spending with query:', JSON.stringify(query, null, 2));
    return result.length > 0 ? result[0].totalAmount : 0;
}


module.exports = {
  getTransactions,
  getTotalSpending,
};
