const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { parsePaymentSuccessContent } = require('./qrisParser');
const { checkTransactionLimit } = require('../services/notification.service');
const { saveTransaction } = require('../services/email.service.js');
const { sendTelegramMessage } = require('../services/telegram.service.js');
const Transaction = require('../models/Transaction.model.js');

class EmailScraper {
  constructor(imapConfig) {
    this.imapConfig = imapConfig; // Simpan konfigurasi IMAP
    this.imap = new Imap({
      user: imapConfig.user,
      password: imapConfig.password,
      host: imapConfig.host || 'imap.gmail.com',
      port: imapConfig.port || 993,
      tls: true,
      authTimeout: 30000
    });
  }

  async scrapeQRISEmails(telegramChatId) {
    return new Promise((resolve, reject) => {
      const emails = [];

      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) return reject(err);

          this.imap.search([['HEADER', 'SUBJECT', 'Pembayaran Berhasil']], (err, results) => {
            if (err) return reject(err);

            if (!results || results.length === 0) {
              this.imap.end();
              return resolve([]);
            }

            const fetch = this.imap.fetch(results, { bodies: '' });
            const messagePromises = [];

            fetch.on('message', (msg) => {
              let buffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString();
                });

                stream.on('end', () => {
                  messagePromises.push(
                    (async () => {
                      try {
                        const mail = await simpleParser(buffer);
                        const transaction = parsePaymentSuccessContent(mail);
                        //console.log('Transaction:', transaction);

                        if (transaction.amount) {
                          // Tambahkan field email user ke transaksi
                          transaction.email = this.imapConfig.user; // atau ambil dari context email user

                          const existing = await Transaction.findOne({ emailId: transaction.emailId });
                          if (!existing) {
                            const newTransaction = await saveTransaction(transaction);
                            console.log(`[Scraper] Transaction saved for ${transaction.email}:`, newTransaction.receiver, newTransaction.amount);

                            // Periksa batas transaksi setelah menyimpan (tanpa await agar tidak memblokir proses)
                            checkTransactionLimit(transaction.email);

                            // Kirim ke chatId yang diberikan
                            await sendTelegramMessage(
                              `Transaksi QRIS Masuk!\nNominal: Rp${transaction.amount}\nMerchant: ${transaction.receiver || '-'}\nTanggal: ${transaction.date}`,
                              telegramChatId // tambahkan parameter ini
                            );
                            emails.push(transaction);
                          }
                        }
                      } catch (error) {
                        console.error('Email processing error:', error);
                      }
                    })()
                  );
                });
              });
            });

            fetch.once('end', async () => {
              await Promise.all(messagePromises);
              this.imap.end();
              resolve(emails);
            });
          });
        });
      });

      this.imap.once('error', (err) => {
        reject(err);
      });

      this.imap.connect();
    });
  }
}

module.exports = EmailScraper;