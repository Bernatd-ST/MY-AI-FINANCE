require('dotenv').config();
const axios = require('axios');

async function askOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Tambahkan pengecekan response
  if (
    !response.data ||
    !response.data.choices ||
    !response.data.choices[0] ||
    !response.data.choices[0].message ||
    !response.data.choices[0].message.content
  ) {
    console.error('OpenAI error:', response.data.error);
    throw new Error('Jawaban dari OpenAI tidak valid');
  }

  return response.data.choices[0].message.content.trim();
}

module.exports = { askOpenAI };