const Transaction = require('../models/Transaction.model.js');
const { sendNotification } = require('./notification.service');

async function saveTransaction(transactionData) {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { emailId: transactionData.emailId },
      transactionData,
      { upsert: true, new: true }
    );

    /*if (transaction._isNew) {
      await sendNotification({
        type: 'NEW_TRANSACTION',
        data: transaction
      });
    }*/

    return transaction;
  } catch (error) {
    console.error('Failed to save transaction:', error);
    throw error;
  }
}

module.exports = { saveTransaction };