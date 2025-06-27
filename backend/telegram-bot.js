const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const config = require('./src/config/config');
const connectDB = require('./src/utils/db');
const EmailAccount = require('./src/models/EmailAccount.model');
const { getTransactions, getTotalSpending } = require('./src/services/transaction.service');
const dayjs = require('dayjs');

// Inisialisasi OpenAI Client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
connectDB();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Halo! Chat ID kamu adalah: <b>${chatId}</b>\n\nCopy Chat ID ini dan masukkan ke aplikasi web.`,
    { parse_mode: 'HTML' }
  );
});

// Daftar "alat" yang bisa digunakan oleh AI
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_total_spending',
      description: 'Mendapatkan total nominal transaksi berdasarkan filter seperti periode waktu atau nama merchant.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Tanggal mulai dalam format YYYY-MM-DD. Contoh: 2024-01-01',
          },
          endDate: {
            type: 'string',
            description: 'Tanggal akhir dalam format YYYY-MM-DD. Contoh: 2024-01-31',
          },
          merchant: {
            type: 'string',
            description: 'Nama merchant atau toko, pencarian parsial didukung. Contoh: "Gojek" atau "Starbucks"',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions_list',
      description: 'Mendapatkan daftar transaksi detail berdasarkan filter.',
      parameters: {
        type: 'object',
        properties: {
           startDate: {
            type: 'string',
            description: 'Tanggal mulai dalam format YYYY-MM-DD.',
          },
          endDate: {
            type: 'string',
            description: 'Tanggal akhir dalam format YYYY-MM-DD.',
          },
          merchant: {
            type: 'string',
            description: 'Nama merchant atau toko.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_chat_id',
      description: 'Mendapatkan Chat ID unik pengguna yang sedang berinteraksi dengan bot. Gunakan ini jika pengguna bertanya "berapa chat id saya?" atau sejenisnya.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  }
];

// System Prompt untuk AI
const systemPrompt = `
Kamu adalah "Asisten Keuangan AI" yang sangat canggih, ramah, dan akurat. Peranmu adalah membantu pengguna memahami data keuangan mereka dan informasi terkait akun mereka.

Aturan Penting:
1.  **JANGAN PERNAH** membuat asumsi atau mengarang data. Jika kamu butuh informasi, gunakan "alat" (functions) yang telah disediakan.
2.  **SELALU** gunakan alat untuk menjawab pertanyaan yang berhubungan dengan angka, total, atau daftar transaksi. Jangan berhitung manual.
3.  Gunakan tanggal hari ini: ${dayjs().format('YYYY-MM-DD')} jika pengguna bertanya tentang "hari ini", "bulan ini", dll. Terjemahkan pertanyaan relatif (misal: "kemarin", "minggu lalu") ke dalam format tanggal YYYY-MM-DD saat memanggil fungsi.
4.  Jika pengguna bertanya tentang "chat id saya" atau sejenisnya, gunakan alat 'get_user_chat_id' untuk memberikannya.
5.  Setelah mendapatkan data dari alat, berikan jawaban yang jelas, singkat, dan mudah dimengerti dalam Bahasa Indonesia.
6.  Jika pengguna hanya menyapa atau bertanya hal di luar konteks keuangan, jawab dengan ramah tanpa menggunakan alat.
`;

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/start')) return;

  const chatId = msg.chat.id;
  const userQuestion = msg.text;

  try {
    const emailAccount = await EmailAccount.findOne({ telegramChatId: String(chatId) });
    if (!emailAccount) {
      bot.sendMessage(chatId, "Akun Telegram kamu belum terdaftar. Silakan daftar dulu di aplikasi web.");
      return;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ];

    // Langkah 1: Kirim pesan ke AI dan lihat apakah AI ingin menggunakan alat
    let response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // atau model lain yang mendukung function calling
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
    });

    let responseMessage = response.choices[0].message;

    // Langkah 2: Periksa apakah AI meminta untuk memanggil fungsi
    const toolCalls = responseMessage.tool_calls;
    if (toolCalls) {
      messages.push(responseMessage); // Tambahkan respons AI (yang berisi permintaan tool call) ke histori

      // Langkah 3: Panggil semua fungsi yang diminta oleh AI
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResponse = '';

        console.log(`[Bot] AI wants to call function: ${functionName} with args:`, functionArgs);

        if (functionName === 'get_total_spending') {
          const total = await getTotalSpending(emailAccount.email, functionArgs);
          functionResponse = JSON.stringify({ total: total, currency: 'IDR' });
        } else if (functionName === 'get_transactions_list') {
          const transactions = await getTransactions(emailAccount.email, functionArgs);
          functionResponse = JSON.stringify(transactions);
        } else if (functionName === 'get_user_chat_id') {
          functionResponse = JSON.stringify({ chat_id: chatId });
        }

        // Tambahkan hasil dari fungsi ke histori pesan
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: functionResponse,
        });
      }

      // Langkah 4: Kirim kembali histori pesan (termasuk hasil fungsi) ke AI untuk mendapatkan jawaban akhir
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
      });

      bot.sendMessage(chatId, finalResponse.choices[0].message.content);

    } else {
      // Jika AI tidak menggunakan alat, langsung kirim jawabannya
      bot.sendMessage(chatId, responseMessage.content);
    }

  } catch (err) {
    console.error('Error di handler bot:', err);
    bot.sendMessage(chatId, "Maaf, terjadi kesalahan saat memproses permintaan Anda.");
  }
});