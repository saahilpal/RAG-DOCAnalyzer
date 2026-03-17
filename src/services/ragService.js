const env = require('../config/env');
const logger = require('../config/logger');
const db = require('../database/client');
const { AppError } = require('../utils/errors');
const { toVectorLiteral } = require('../utils/vector');
const { embedTexts, streamGeneration } = require('./geminiService');
const { getCachedAnswer, setCachedAnswer } = require('./cacheService');

function normalizeChunks(rows) {
  return rows.map((row) => ({
    chunkIndex: Number(row.chunk_index) || 0,
    content: String(row.content || ''),
  }));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPromptChunkCharLimit() {
  return clamp(Math.floor(env.ragChunkTokens * env.ragTokenToCharRatio), 400, 4000);
}

function getFallbackSnippetLimit() {
  return clamp(Math.floor(getPromptChunkCharLimit() / 4), 180, 1000);
}

async function retrieveFtsChunks({ userId, documentId, query }) {
  let result;
  try {
    result = await db.query(
      `SELECT c.content, c.chunk_index,
              ts_rank_cd(c.search_vector, websearch_to_tsquery('english', $3)) AS score
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE d.user_id = $1
         AND c.document_id = $2
         AND c.search_vector @@ websearch_to_tsquery('english', $3)
       ORDER BY score DESC, c.chunk_index ASC
       LIMIT $4`,
      [userId, documentId, query, env.ragCandidatePageSize],
    );
  } catch (_error) {
    result = { rowCount: 0, rows: [] };
  }

  if (result.rowCount > 0) {
    return normalizeChunks(result.rows).slice(0, env.ragTopK);
  }

  return [];
}

async function retrieveVectorChunks({ userId, documentId, query }) {
  const [embedding] = await embedTexts([query]);
  const vectorLiteral = toVectorLiteral(embedding, env.embeddingDimension);

  const result = await db.query(
    `SELECT c.content, c.chunk_index
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE d.user_id = $1
       AND c.document_id = $2
       AND c.embedding IS NOT NULL
     ORDER BY c.embedding <-> $3::vector
     LIMIT $4`,
    [userId, documentId, vectorLiteral, env.ragTopK],
  );

  if (result.rowCount === 0) {
    return retrieveFtsChunks({ userId, documentId, query });
  }

  return normalizeChunks(result.rows);
}

async function retrieveRelevantChunks({ userId, documentId, query }) {
  if (env.retrievalMode === 'vector') {
    return retrieveVectorChunks({ userId, documentId, query });
  }

  return retrieveFtsChunks({ userId, documentId, query });
}

function buildPrompt({ query, chunks }) {
  const chunkCharLimit = getPromptChunkCharLimit();
  const context =
    chunks.length > 0
      ? chunks
          .map((chunk, index) => {
            const trimmed = chunk.content.replace(/\s+/g, ' ').trim().slice(0, chunkCharLimit);
            return `[Chunk ${index + 1}] ${trimmed}`;
          })
          .join('\n\n')
      : 'No relevant context was retrieved from the document.';

  return `SYSTEM:
You are a document analysis assistant.

CONTEXT:
${context}

USER QUESTION:
${query}

Answer only using the provided context. If context is insufficient, say that clearly.`;
}

function buildFallbackAnswer({ query, chunks }) {
  if (chunks.length === 0) {
    return `I could not find matching context for: "${query}". Upload or select a document with relevant content and try again.`;
  }

  const snippetLimit = getFallbackSnippetLimit();
  const bulletPoints = chunks
    .map((chunk, index) => {
      const sentence = chunk.content.replace(/\s+/g, ' ').trim().slice(0, snippetLimit);
      return `${index + 1}. ${sentence}${sentence.length >= snippetLimit ? '...' : ''}`;
    })
    .join('\n');

  return `AI response is temporarily unavailable in this demo environment, so here are the most relevant extracted passages:\n${bulletPoints}`;
}

async function streamTextAsChunks(answer, onToken) {
  const tokens = answer.split(/(\s+)/).filter(Boolean);
  for (const token of tokens) {
    if (typeof onToken === 'function') {
      onToken(token);
    }
  }
}

function assertNotAborted(shouldAbort) {
  if (typeof shouldAbort === 'function' && shouldAbort()) {
    throw new AppError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before response completed.');
  }
}

async function streamRagAnswer({ userId, documentId, query, onToken, shouldAbort }) {
  assertNotAborted(shouldAbort);

  try {
    const cached = await getCachedAnswer({ documentId, query });
    if (cached) {
      assertNotAborted(shouldAbort);
      await streamTextAsChunks(cached.answer, onToken);
      return {
        answer: cached.answer,
        chunks: Array.isArray(cached.sourceChunks) ? cached.sourceChunks : [],
        fallbackUsed: Boolean(cached.fallbackUsed),
        cached: true,
        aiErrorCode: null,
      };
    }
  } catch (error) {
    logger.warn('Cache read failed. Continuing without cache.', {
      documentId,
      message: error?.message,
    });
  }

  assertNotAborted(shouldAbort);
  const chunks = await retrieveRelevantChunks({ userId, documentId, query });
  assertNotAborted(shouldAbort);
  const prompt = buildPrompt({ query, chunks });

  let answer = '';
  let fallbackUsed = false;
  let aiErrorCode = null;

  try {
    for await (const token of streamGeneration(prompt, { shouldAbort })) {
      answer += token;
      if (typeof onToken === 'function') {
        onToken(token);
      }
    }
  } catch (error) {
    if (error?.code === 'CLIENT_DISCONNECTED') {
      throw error;
    }

    fallbackUsed = true;
    aiErrorCode = error?.code || 'AI_TEMPORARILY_UNAVAILABLE';
    answer = buildFallbackAnswer({ query, chunks });
    assertNotAborted(shouldAbort);
    await streamTextAsChunks(answer, onToken);
  }

  assertNotAborted(shouldAbort);
  if (!answer.trim()) {
    fallbackUsed = true;
    answer = buildFallbackAnswer({ query, chunks });
    await streamTextAsChunks(answer, onToken);
  }

  const sourceChunks = chunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    content: chunk.content.slice(0, getFallbackSnippetLimit()),
  }));

  try {
    assertNotAborted(shouldAbort);
    await setCachedAnswer({
      documentId,
      query,
      answer,
      fallbackUsed,
      sourceChunks,
    });
  } catch (error) {
    logger.warn('Cache write failed. Skipping cache persistence.', {
      documentId,
      message: error?.message,
    });
  }

  return {
    answer,
    chunks,
    fallbackUsed,
    cached: false,
    aiErrorCode,
  };
}

module.exports = {
  streamRagAnswer,
  retrieveRelevantChunks,
};
