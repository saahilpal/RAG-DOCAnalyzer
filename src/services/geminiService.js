const { ai } = require('../config/gemini');
const env = require('../config/env');
const { AppError, badRequest } = require('../utils/errors');

function withTimeout(promise, timeoutMs, timeoutCode = 'AI_TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError(504, timeoutCode, 'AI request timed out for demo environment.'));
      }, timeoutMs).unref();
    }),
  ]);
}

function mapGeminiError(error) {
  if (error instanceof AppError) {
    return error;
  }

  const status = Number(error?.status) || 0;
  const message = String(error?.message || '').toLowerCase();

  if (status === 429 || message.includes('429') || message.includes('quota')) {
    return new AppError(429, 'AI_QUOTA_EXCEEDED', 'AI quota exceeded for demo environment.');
  }

  if (status === 504 || message.includes('timeout')) {
    return new AppError(504, 'AI_TIMEOUT', 'AI request timed out for demo environment.');
  }

  return new AppError(503, 'AI_TEMPORARILY_UNAVAILABLE', 'AI service is temporarily unavailable.');
}

async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  try {
    const response = await withTimeout(
      ai.models.embedContent({
        model: env.geminiEmbeddingModel,
        contents: texts,
        config: {
          outputDimensionality: env.embeddingDimension,
        },
      }),
      env.aiTimeoutMs,
    );

    const embeddings = response?.embeddings || [];

    if (embeddings.length !== texts.length) {
      throw new AppError(502, 'EMBEDDING_ERROR', 'Embedding response size mismatch.');
    }

    return embeddings.map((item) => {
      const values = item?.values;
      if (!Array.isArray(values) || values.length !== env.embeddingDimension) {
        throw badRequest(`Gemini embedding dimension is invalid. Expected ${env.embeddingDimension}.`);
      }
      return values;
    });
  } catch (error) {
    throw mapGeminiError(error);
  }
}

async function* streamGeneration(prompt, options = {}) {
  const { shouldAbort } = options;

  try {
    const stream = await withTimeout(
      ai.models.generateContentStream({
        model: env.geminiModel,
        contents: prompt,
      }),
      env.aiTimeoutMs,
    );

    for await (const chunk of stream) {
      if (typeof shouldAbort === 'function' && shouldAbort()) {
        throw new AppError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before response completed.');
      }

      const text = chunk?.text || '';
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    throw mapGeminiError(error);
  }
}

async function checkGeminiReady() {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: env.geminiModel,
        contents: 'Reply with OK',
        config: {
          temperature: 0,
          maxOutputTokens: 3,
        },
      }),
      Math.min(env.aiTimeoutMs, 5_000),
    );

    return Boolean(response?.text);
  } catch {
    return false;
  }
}

module.exports = {
  embedTexts,
  streamGeneration,
  checkGeminiReady,
};
