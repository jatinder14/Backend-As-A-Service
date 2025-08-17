require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function getChatSummary(chatMessages) {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

  // const formattedChat = formatChatMessages(chatMessages);
  const formattedChat = JSON.stringify(chatMessages);
  const prompt = `Can you summarize this WhatsApp chat conversation:\n\n${formattedChat}`;

  const response = await ai.models.generateContent({
    model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.0-flash',
    // contents: "Can you summarize this WhatsApp chat conversation?",
    contents: prompt,
  });
  const text = response.text;

  // const cleanText = text.replace(/\\n/g, '\n');
  // console.log(cleanText);

  return text;
}

module.exports = {
  getChatSummary,
};
