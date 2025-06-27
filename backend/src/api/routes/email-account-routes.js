const express = require('express');
const router = express.Router();
const { registerAccount, verifyAccount } = require('../controllers/email-account.controller');

router.post('/register', registerAccount);

// Rute untuk memverifikasi akun sebelum mengunduh laporan
router.post('/verify', verifyAccount);

module.exports = router;