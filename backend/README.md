# Asisten Keuangan AI: Pelacak Transaksi QRIS via Email & Telegram

## 🚀 Ringkasan Proyek

Proyek ini adalah sistem backend cerdas yang berfungsi sebagai asisten keuangan pribadi. Aplikasi ini secara otomatis memantau email Anda untuk transaksi QRIS, menyimpannya ke dalam database, dan memberikan notifikasi serta laporan interaktif melalui bot Telegram. Dilengkapi dengan AI untuk pemantauan batas pengeluaran, sistem ini membantu pengguna mengelola keuangan mereka secara proaktif.

## ✨ Fitur Utama

- **Email Scraper Otomatis**: Membaca inbox email secara periodik menggunakan IMAP untuk mendeteksi dan mem-parsing detail transaksi pembayaran QRIS.
- **Integrasi Bot Telegram**: Terhubung dengan bot Telegram untuk mengirim notifikasi transaksi secara *real-time* dan merespons perintah pengguna.
- **Notifikasi Batas Pengeluaran**: Sistem AI memonitor total transaksi bulanan dan mengirimkan peringatan melalui Telegram jika pengeluaran mendekati (80%) atau melebihi batas yang ditentukan (Rp 1.500.000).
- **Laporan Transaksi Excel**: Menghasilkan laporan transaksi bulanan dalam format `.xlsx` yang dapat diunduh melalui halaman web, dengan filter berdasarkan rentang tanggal.
- **Dashboard Sederhana**: Antarmuka web minimalis untuk memverifikasi email dan mengunduh laporan.
- **Parsing Data Cerdas**: Mampu menangani berbagai format tanggal (termasuk bulan dalam Bahasa Indonesia) dan format nominal mata uang (Rp) untuk memastikan data akurat.

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Database**: MongoDB dengan Mongoose ODM
- **Real-time Communication**: Telegram Bot API
- **Email Scraping**: `node-imap`, `mailparser`
- **Laporan**: `exceljs`
- **HTTP Client**: `axios`
- **Date Handling**: `dayjs` dengan plugin timezone & custom parse
- **Environment**: `dotenv`
- **Concurrency**: `npm-run-all`

## 🧠 Implementasi AI dengan OpenAI (GPT)

Selain fitur notifikasi batas transaksi berbasis aturan, proyek ini dirancang untuk dapat diintegrasikan dengan **OpenAI GPT API** untuk menyediakan fungsionalitas AI yang lebih canggih. Integrasi ini memungkinkan asisten keuangan untuk tidak hanya melacak, tetapi juga memahami dan berinteraksi dengan data keuangan pengguna secara cerdas.

**Contoh Kemampuan Tambahan:**
- **Kategorisasi Transaksi Otomatis**: GPT dapat menganalisis nama *merchant* dari transaksi dan secara otomatis mengklasifikasikannya ke dalam kategori seperti "Makan & Minum", "Transportasi", "Belanja Online", dll.
- **Ringkasan Pengeluaran Cerdas**: Pengguna dapat meminta ringkasan pengeluaran dalam bahasa natural, dan GPT akan menghasilkan laporan naratif. Contoh: *"Berikan ringkasan belanjaku minggu ini."*
- **Tanya Jawab Keuangan**: Memungkinkan bot Telegram menjawab pertanyaan yang lebih kompleks seperti *"Berapa total pengeluaranku untuk kopi bulan lalu?"* atau *"Apa saja langganan berulang yang aktif?"*.

## 📂 Struktur Proyek

```
/backend
├── public/             # File statis untuk frontend (HTML, CSS)
├── src/
│   ├── api/            # Logika API (routes, controllers, app.js)
│   ├── config/         # Konfigurasi aplikasi (database, env)
│   ├── models/         # Skema database Mongoose
│   ├── scraper/        # Logika untuk scraping & parsing email
│   ├── services/       # Layanana bisnis (email, notifikasi, telegram)
│   └── utils/          # Fungsi utilitas
├── .env.example        # Contoh file environment
├── package.json
└── telegram-bot.js     # Logika utama untuk bot Telegram
```

## ⚙️ Instalasi & Konfigurasi

1.  **Clone Repositori**
    ```bash
    git clone <url-repositori-anda>
    cd backend
    ```

2.  **Install Dependensi**
    ```bash
    npm install
    ```

3.  **Buat File Environment**
    Salin file `.env.example` menjadi `.env` dan isi semua variabel yang dibutuhkan.
    ```bash
    cp .env.example .env
    ```

    **Isi `.env`:**
    - `MONGO_URI`: URI koneksi MongoDB Anda.
    - `TELEGRAM_BOT_TOKEN`: Token API untuk bot Telegram Anda.
    - `EMAIL_ACCOUNTS`: Array JSON berisi kredensial akun email yang akan dipantau.
      - **user**: Alamat email.
      - **password**: Password email (atau App Password jika 2FA aktif).
      - **host**: Server IMAP (misal: `imap.gmail.com`).
      - **port**: Port IMAP (misal: `993`).
      - **tls**: `true`.
      - **telegramChatId**: ID chat Telegram unik untuk menerima notifikasi.

4.  **Jalankan Aplikasi**
    Perintah ini akan menjalankan server API dan bot Telegram secara bersamaan.
    ```bash
    NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
    ```

## Endpoints API

- **`GET /api/transactions/report`**: Mengunduh laporan transaksi dalam format Excel.
  - **Query Params**:
    - `email` (wajib): Email pengguna yang terdaftar.
    - `telegramChatId` (wajib): ID chat Telegram untuk verifikasi.
    - `startDate` (opsional): Tanggal mulai (format: `YYYY-MM-DD`).
    - `endDate` (opsional): Tanggal akhir (format: `YYYY-MM-DD`).

## 📄 Lisensi

Proyek ini dilisensikan oleh Bernatd ST.

graph TD
    subgraph "Proses Otomatis: Pemeriksaan Email via Scheduler"
        A[Mulai] --> B(Scheduler Aktif);
        B --> C{Loop untuk setiap akun email};
        C --> D[Hubungkan ke Server Email (IMAP)];
        D --> E{Cari email transaksi yang belum dibaca};
        E -- Ditemukan --> F[Ambil konten email];
        E -- Tidak ada --> G[Tutup koneksi & Selesai];
        
        F --> H[Parse Email (Metode Hibrida)];
        H -- Sukses --> I{Data valid? (Nominal & Tgl ada)};
        H -- Gagal --> E;
        
        I -- Ya --> J{Cek duplikat di Database};
        I -- Tidak --> E;
        
        J -- Transaksi Baru --> K[Simpan ke Database MongoDB];
        J -- Duplikat --> E;
        
        K --> L[Kirim Notifikasi ke Telegram];
        L --> M[Tandai email sudah dibaca];
        M --> E;
    end


    graph TD
    subgraph "Interaksi Pengguna via API"
        U[Pengguna] --> V{Kirim Request ke API};
        
        V -- GET /api/transactions/report --> W[Controller Laporan];
        W --> X[Ambil semua transaksi dari DB];
        X --> Y[Generate File Laporan Excel];
        Y --> Z[Kirim file Excel sebagai download];
        
        V -- GET /api/transactions/summary --> AA[Controller Ringkasan];
        AA --> AB[Ambil & olah data dari DB];
        AB --> AC[Kirim ringkasan (JSON)];

        V -- GET /api/transactions --> AD[Controller Transaksi];
        AD --> AE[Ambil daftar transaksi dari DB];
        AE --> AF[Kirim daftar transaksi (JSON)];
    end
