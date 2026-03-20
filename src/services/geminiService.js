const { TaskType } = require('@google/generative-ai');

const { generationModel, embeddingModel } = require('../config/gemini');
const env = require('../config/env');
const logger = require('../config/logger');
const { AppError, badRequest } = require('../utils/errors');

function withTimeout(promise, timeoutMs, timeoutCode = 'AI_TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError(504, timeoutCode, 'AI request timed out.'));
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
    return new AppError(429, 'AI_QUOTA_EXCEEDED', 'AI quota exceeded.');
  }

  if (status === 504 || message.includes('timeout')) {
    return new AppError(504, 'AI_TIMEOUT', 'AI request timed out.');
  }

  return new AppError(503, 'AI_TEMPORARILY_UNAVAILABLE', 'AI service is temporarily unavailable.');
}

function serializeGeminiError(error) {
  return {
    name: error?.name || null,
    message: error?.message || null,
    status: error?.status || null,
    statusText: error?.statusText || null,
    code: error?.code || null,
    stack: error?.stack || null,
    errorDetails: error?.errorDetails || null,
    cause: error?.cause || null,
  };
}

async function embedTexts(texts, options = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  try {
    logger.info('Gemini embedding request started', {
      model: env.geminiEmbeddingModel,
      textCount: texts.length,
    });

    const taskType = options.taskType || TaskType.RETRIEVAL_DOCUMENT;
    const responses = await Promise.all(
      texts.map((text) =>
        withTimeout(
          embeddingModel.embedContent({
            content: {
              role: 'user',
              parts: [{ text }],
            },
            taskType,
          }),
          env.aiTimeoutMs,
          'EMBEDDING_TIMEOUT',
        ),
      ),
    );

    return responses.map((item) => {
      const values = item?.embedding?.values;
      if (!Array.isArray(values) || values.length !== env.embeddingDimension) {
        throw badRequest(`Gemini embedding dimension is invalid. Expected ${env.embeddingDimension}.`);
      }
      return values;
    });
  } catch (error) {
    logger.error('Gemini embedding request failed', {
      model: env.geminiEmbeddingModel,
      error: serializeGeminiError(error),
    });
    throw mapGeminiError(error);
  }
}

async function* streamGeneration(prompt, options = {}) {
  const { shouldAbort } = options;

  try {
    logger.info('Gemini generation request started', {
      model: env.geminiModel,
    });

    const result = await withTimeout(
      generationModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
      env.aiTimeoutMs,
    );

    if (typeof shouldAbort === 'function' && shouldAbort()) {
      throw new AppError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before response completed.');
    }

    const text = result?.response?.text?.() || '';
    if (text) {
      yield text;
    }
  } catch (error) {
    logger.error('Gemini generation request failed', {
      model: env.geminiModel,
      error: serializeGeminiError(error),
    });
    throw mapGeminiError(error);
  }
}

async function checkGeminiReady() {
  try {
    logger.info('Gemini readiness check started', {
      model: env.geminiModel,
    });

    const result = await withTimeout(
      generationModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Reply with OK' }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 3,
        },
      }),
      Math.min(env.aiTimeoutMs, 5_000),
    );

    return Boolean(result?.response?.text?.());
  } catch (error) {
    logger.error('Gemini readiness check failed', {
      model: env.geminiModel,
      error: serializeGeminiError(error),
    });
    return false;
  }
}

module.exports = {
  embedTexts,
  streamGeneration,
  checkGeminiReady,
};
