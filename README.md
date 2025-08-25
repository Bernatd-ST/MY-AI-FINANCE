=========================================================
EMAIL QRIS SCRAPER & TELEGRAM NOTIFIKASI - DOKUMENTASI
=========================================================

1. SETUP
--------

a. Clone & Install Dependency
-----------------------------
git clone <repo-url>
cd backend
npm install

b. Buat File .env
-----------------
Contoh isi:
PORT=3000
MONGODB_URI=mongodb://localhost:27017/qris-app
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

- EMAIL_PASSWORD: gunakan App Password Gmail.
- TELEGRAM_BOT_TOKEN: dapat dari BotFather.
- TELEGRAM_CHAT_ID: dapat dari hasil /getUpdates Telegram API.

---------------------------------------------------------

2. CARA TESTING
---------------

a. Jalankan MongoDB Lokal
-------------------------
Pastikan MongoDB sudah berjalan:
mongod
atau (jika pakai brew):
brew services start mongodb-community

b. Jalankan Server Node.js
--------------------------
npm run dev || NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
Pastikan muncul log:
Server running on port 3000
MongoDB connected

c. Testing API dengan Postman
-----------------------------
- Endpoint: POST http://localhost:3000/api/transactions/fetch
  Method: POST
  Body: kosong
  Response:
  { "success": true, "count": 2 }

- Endpoint: GET http://localhost:3000/api/transactions/
  Method: GET
  Response:
  { "success": true, "transactions": [ ... ] }

d. Cek Notifikasi Telegram
-------------------------
Setelah POST /fetch, cek Telegram. Bot akan mengirim notifikasi jika ada email QRIS baru.

---------------------------------------------------------

3. DOKUMENTASI API
------------------

A. Fetch Email QRIS
-------------------
- Endpoint: /api/transactions/fetch
- Method: POST
- Request Body: (kosong)
- Response:
  {
    "success": true,
    "count": 2
  }

B. Get List Transaksi
---------------------
- Endpoint: /api/transactions/
- Method: GET
- Request Body: (kosong)
- Response:
  {
    "success": true,
    "transactions": [
      {
        "_id": "...",
        "emailId": "...",
        "subject": "...",
        "from": "...",
        "date": "...",
        "amount": 18000,
        "merchant": "...",
        "rawText": "..."
      },
      ...
    ]
  }

  C. Rekap Bulanan (Summary)
--------------------------
- Endpoint: /api/transactions/summary?month=YYYY-MM
- Method: GET
- Query: month (format: YYYY-MM, contoh: 2025-06)
- Response:
  {
    "success": true,
    "totalAmount": 79000,
    "topReceiver": { "receiver": "WARUNG JAWA KIRANA", "amount": 29000 },
    "topDate": { "date": "2025-06-03", "amount": 29000 },
    "count": 3
  }

---------------------------------------------------------

4. FLOW PROGRAM SECARA TEKNIS
-----------------------------

1. Start Server
   - Jalankan npm run dev -> file utama: src/api/app.js
   - Koneksi ke MongoDB (src/utils/db.js)
   - Load router /api/transactions (src/api/routes/transaction-routes.js)

2. Trigger Scraping (POST /fetch)
   - Endpoint /api/transactions/fetch diakses (misal via Postman)
   - Membuat instance EmailScraper (src/scraper/emailScraper.js)
   - Koneksi ke IMAP Gmail, buka inbox

3. Ambil Email QRIS
   - Cari email dengan subject mengandung "QRIS"
   - Untuk setiap email, parsing isi email (mailparser)

4. Parse & Simpan Transaksi
   - Ekstrak data QRIS (parseQRISContent di src/scraper/qrisParser.js)
   - Simpan ke database MongoDB (saveTransaction di src/services/email.service.js)

5. Kirim Notifikasi Telegram
   - Setelah transaksi berhasil disimpan, kirim pesan ke Telegram (sendTelegramMessage di src/services/telegram.service.js)

6. Response ke Client
   - API mengembalikan response jumlah transaksi yang diproses

7. Cek Data
   - Data transaksi bisa diambil lewat endpoint GET /api/transactions/
   - Data juga bisa dilihat di MongoDB Compass pada database qris-app, koleksi transactions

---------------------------------------------------------
