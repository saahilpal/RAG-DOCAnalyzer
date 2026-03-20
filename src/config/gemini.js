const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const geminiApiKey = String(process.env.GEMINI_API_KEY || '').trim();

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const generationModel = genAI.getGenerativeModel({
  model: env.geminiModel,
});
const embeddingModel = genAI.getGenerativeModel({
  model: env.geminiEmbeddingModel,
});

module.exports = {
  genAI,
  generationModel,
  embeddingModel,
};
