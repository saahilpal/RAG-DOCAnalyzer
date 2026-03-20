const env = require('../config/env');
const db = require('../database/client');
const { AppError } = require('../utils/errors');
const { toVectorLiteral } = require('../utils/vector');
const geminiService = require('./geminiService');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPromptChunkCharLimit() {
  return clamp(Math.floor(env.chunkSizeTokens * env.ragTokenToCharRatio), 500, 4500);
}

function normalizeChunks(rows) {
  return rows.map((row) => ({
    documentId: row.document_id,
    fileName: String(row.file_name || 'Document'),
    chunkIndex: Number(row.chunk_index) || 0,
    content: String(row.content || ''),
  }));
}

function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return 'No prior conversation.';
  }

  return history
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${String(message.content || '').trim()}`)
    .join('\n');
}

function formatContext(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return 'No uploaded document context attached to this chat.';
  }

  const charLimit = getPromptChunkCharLimit();

  return chunks
    .map((chunk, index) => {
      const trimmed = chunk.content.replace(/\s+/g, ' ').trim().slice(0, charLimit);
      return `[Source ${index + 1} | ${chunk.fileName} | chunk ${chunk.chunkIndex}] ${trimmed}`;
    })
    .join('\n\n');
}

function buildPrompt({ history, chunks, userMessage }) {
  return `SYSTEM:
You are a helpful assistant in a chat-first RAG workspace.
Use uploaded document context when it is relevant and available.
If the documents do not contain enough information, say that clearly and then answer with the best general guidance you can.
Keep continuity with the existing conversation.

CHAT HISTORY:
${formatHistory(history)}

DOCUMENT CONTEXT:
${formatContext(chunks)}

CURRENT USER MESSAGE:
${userMessage}

ASSISTANT RESPONSE:`;
}

async function retrieveFtsChunks({ userId, chatId, query }) {
  try {
    const result = await db.query(
      `SELECT d.id AS document_id,
              d.file_name,
              c.content,
              c.chunk_index,
              ts_rank_cd(c.search_vector, websearch_to_tsquery('english', $3)) AS score
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       JOIN chat_documents cd ON cd.document_id = d.id
       JOIN chats ch ON ch.id = cd.chat_id
       WHERE ch.user_id = $1
         AND ch.id = $2
         AND d.status = 'indexed'
         AND c.search_vector @@ websearch_to_tsquery('english', $3)
       ORDER BY score DESC, c.chunk_index ASC
       LIMIT $4`,
      [userId, chatId, query, env.ragCandidatePageSize],
    );

    return normalizeChunks(result.rows).slice(0, env.ragTopK);
  } catch (error) {
    throw new AppError(503, 'RETRIEVAL_FAILED', 'Failed to retrieve document context.', {
      message: error.message,
    });
  }
}

async function retrieveVectorChunks({ userId, chatId, query }) {
  let embedding;

  try {
    [embedding] = await geminiService.embedTexts([query], { taskType: 'RETRIEVAL_QUERY' });
  } catch {
    return retrieveFtsChunks({ userId, chatId, query });
  }

  const vectorLiteral = toVectorLiteral(embedding, env.embeddingDimension);

  try {
    const result = await db.query(
      `SELECT d.id AS document_id,
              d.file_name,
              c.content,
              c.chunk_index
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       JOIN chat_documents cd ON cd.document_id = d.id
       JOIN chats ch ON ch.id = cd.chat_id
       WHERE ch.user_id = $1
         AND ch.id = $2
         AND d.status = 'indexed'
         AND c.embedding IS NOT NULL
       ORDER BY c.embedding <-> $3::vector
       LIMIT $4`,
      [userId, chatId, vectorLiteral, env.ragTopK],
    );

    if (result.rowCount === 0) {
      return retrieveFtsChunks({ userId, chatId, query });
    }

    return normalizeChunks(result.rows);
  } catch (error) {
    throw new AppError(503, 'RETRIEVAL_FAILED', 'Failed to retrieve document context.', {
      message: error.message,
    });
  }
}

async function retrieveRelevantChunks({ userId, chatId, query }) {
  if (env.retrievalMode === 'vector') {
    return retrieveVectorChunks({ userId, chatId, query });
  }

  return retrieveFtsChunks({ userId, chatId, query });
}

function assertNotAborted(shouldAbort) {
  if (typeof shouldAbort === 'function' && shouldAbort()) {
    throw new AppError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before response completed.');
  }
}

async function streamAssistantReply({ userId, chatId, history, indexedDocuments, userMessage, onToken, shouldAbort }) {
  assertNotAborted(shouldAbort);

  const chunks =
    Array.isArray(indexedDocuments) && indexedDocuments.length > 0
      ? await retrieveRelevantChunks({ userId, chatId, query: userMessage })
      : [];

  const prompt = buildPrompt({
    history: Array.isArray(history) ? history : [],
    chunks,
    userMessage,
  });

  let answer = '';

  for await (const token of geminiService.streamGeneration(prompt, { shouldAbort })) {
    assertNotAborted(shouldAbort);
    answer += token;
    if (typeof onToken === 'function') {
      onToken(token);
    }
  }

  if (!answer.trim()) {
    throw new AppError(502, 'EMPTY_ASSISTANT_RESPONSE', 'The assistant returned an empty response.');
  }

  return {
    answer,
    retrievedChunkCount: chunks.length,
  };
}

module.exports = {
  buildPrompt,
  retrieveRelevantChunks,
  streamAssistantReply,
};
