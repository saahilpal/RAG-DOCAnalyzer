const { GoogleGenAI } = require('@google/genai');
const env = require('./env');

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

module.exports = {
  ai,
};
