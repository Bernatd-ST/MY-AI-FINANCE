const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const cheerio = require('cheerio');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Mapping for Indonesian month names to English abbreviations
const indonesianMonths = {
  'januari': 'Jan', 'februari': 'Feb', 'maret': 'Mar', 'april': 'Apr', 'mei': 'May', 'juni': 'Jun',
  'juli': 'Jul', 'agustus': 'Aug', 'september': 'Sep', 'oktober': 'Oct', 'november': 'Nov', 'desember': 'Dec',
  'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr', 'mei': 'May', 'jun': 'Jun',
  'jul': 'Jul', 'ags': 'Aug', 'agu': 'Aug', 'sep': 'Sep', 'okt': 'Oct', 'nov': 'Nov', 'des': 'Dec'
};

function parsePaymentSuccessContent(mail) {
  const html = mail.html || '';
  const $ = cheerio.load(html);

  // Normalisasi teks: ganti spasi non-breaking, gabungkan spasi berlebih
  const text = $('body').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

  let receiver = null;
  let dateStr = null;
  let timeStr = null;
  let amountStr = null;

  // --- METODE 1: REGEX (Untuk email satu baris & format umum) ---
  
  // Pola untuk nominal: mencari "Nominal Transaksi", "Total Transaksi", atau "Nominal Pembayaran"
  const amountRegex = /(?:Nominal Transaksi|Total Transaksi|Nominal Pembayaran)\s*(Rp\s*[\d.,]+)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    amountStr = amountMatch[1];
  }

  // Pola untuk penerima: mencari teks antara "Penerima" dan "Tanggal"
  const receiverRegex = /Penerima\s*(.*?)\s*Tanggal/i;
  const receiverMatch = text.match(receiverRegex);
  if (receiverMatch && receiverMatch[1]) {
    receiver = receiverMatch[1].trim();
  } else {
    // Fallback untuk "Penyedia Jasa" (pembayaran tagihan)
    const providerRegex = /Penyedia Jasa\s*(.*?)\s*Tanggal/i;
    const providerMatch = text.match(providerRegex);
    if (providerMatch && providerMatch[1]) {
      receiver = providerMatch[1].trim();
    }
  }
  
  // Pola untuk tanggal dan jam
  const dateRegex = /Tanggal\s*(\d{1,2}\s+\w+\s+\d{4})/i;
  const timeRegex = /Jam\s*(\d{2}:\d{2}:\d{2})/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    dateStr = dateMatch[1].trim();
  }
  const timeMatch = text.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    timeStr = timeMatch[1].trim();
  }

  // --- METODE 2: LINE-BASED (Fallback untuk email multi-baris) ---
  // Jika Regex gagal mendapatkan semua info, coba metode lama
  if (!receiver || !dateStr || !amountStr) {
      const lines = $('body').text().split('\n').map(line => line.trim()).filter(line => line);
      lines.forEach((line, index) => {
          const lowerLine = line.toLowerCase();
          // Hanya isi jika belum ditemukan oleh Regex
          if (!receiver && lowerLine.startsWith('penerima')) {
              if (lines[index + 1] && !lines[index + 1].toLowerCase().match(/tanggal|jam|nominal/)) {
                  receiver = lines[index + 1];
              }
          }
          if (!dateStr && lowerLine.startsWith('tanggal')) {
              dateStr = line.replace(/tanggal/i, '').trim();
          }
          if (!timeStr && lowerLine.startsWith('jam')) {
              timeStr = line.replace(/jam/i, '').trim();
          }
          if (!amountStr && lowerLine.startsWith('nominal transaksi')) {
              amountStr = line.replace(/nominal transaksi/i, '').trim();
          }
          if (!amountStr && lowerLine.includes('total transaksi')) {
              amountStr = line.replace(/total transaksi/i, '').trim();
          }
      });
  }

  if (!dateStr || !amountStr) {
    console.log(`[Parser] GAGAL TOTAL: Tidak bisa parse info penting. Date: ${dateStr}, Amount: ${amountStr}. Subject: ${mail.subject}`);
    return {};
  }

  // --- Pembersihan dan Parsing ---
  let finalDate = mail.date;
  try {
    const monthStr = dateStr.split(' ')[1].toLowerCase();
    const englishMonth = indonesianMonths[monthStr];
    if (englishMonth) {
      const formattedDateStr = dateStr.replace(new RegExp(monthStr, 'i'), englishMonth);
      const fullDateTimeStr = `${formattedDateStr} ${timeStr || '00:00:00'}`;
      finalDate = dayjs.tz(fullDateTimeStr, 'D MMM YYYY HH:mm:ss', 'Asia/Jakarta').toDate();
    } else {
      throw new Error(`Invalid month: ${monthStr}`);
    }
  } catch (e) {
    console.error(`Error parsing date: "${dateStr} ${timeStr}". Error: ${e.message}`);
    return {};
  }

  const cleanedAmount = amountStr ? parseFloat(amountStr.replace(/Rp|\s|\./g, '').replace(',', '.')) : 0;

  return {
    emailId: mail.messageId,
    receiver: receiver,
    amount: cleanedAmount,
    date: finalDate,
    currency: 'IDR',
    source: 'QRIS',
    raw: mail.text,
    category: 'Uncategorized',
  };
}

module.exports = { parsePaymentSuccessContent };