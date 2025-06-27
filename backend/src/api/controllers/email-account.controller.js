const EmailAccount = require('../../models/EmailAccount.model');

// Fungsi untuk mendaftarkan akun baru
const registerAccount = async (req, res) => {
  try {
    const { email, appPassword, telegramChatId } = req.body;
    if (!email || !appPassword || !telegramChatId) {
      return res.status(400).json({ success: false, message: 'Semua field harus diisi.' });
    }

    const existingAccount = await EmailAccount.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    const newAccount = new EmailAccount({ email, appPassword, telegramChatId });
    await newAccount.save();

    res.status(201).json({ success: true, message: 'Akun berhasil didaftarkan!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.', error: error.message });
  }
};

// Fungsi untuk memverifikasi akun sebelum download laporan
const verifyAccount = async (req, res) => {
  try {
    const { email, telegramChatId } = req.body;
    if (!email || !telegramChatId) {
      return res.status(400).json({ success: false, message: 'Email dan Telegram Chat ID harus diisi.' });
    }

    const account = await EmailAccount.findOne({ email });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Email tidak ditemukan.' });
    }

    if (account.telegramChatId !== telegramChatId) {
      return res.status(403).json({ success: false, message: 'Telegram Chat ID tidak cocok.' });
    }

    res.json({ success: true, message: 'Verifikasi berhasil.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.', error: error.message });
  }
};

module.exports = { registerAccount, verifyAccount };
