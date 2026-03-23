const pdfParse = require('pdf-parse');

const env = require('../config/env');
const logger = require('../config/logger');
const db = require('../database/client');
const { AppError, badRequest } = require('../utils/errors');
const { chunkText } = require('../utils/chunkText');
const { toVectorLiteral } = require('../utils/vector');
const storageService = require('./storageService');
const geminiService = require('./geminiService');

let intervalHandle = null;
let draining = false;
const RETRY_PREFIX = 'Retrying automatically';

function splitIntoBatches(items, batchSize) {
  const batches = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

async function extractPdfData(buffer) {
  const parsed = await pdfParse(buffer);
  const text = String(parsed?.text || '').trim();
  const pageCount = Number(parsed?.numpages) || 0;

  if (!text) {
    throw badRequest('No readable text found in PDF.');
  }

  if (pageCount > env.maxPagesPerDoc) {
    throw new AppError(
      400,
      'MAX_PAGES_EXCEEDED',
      `Document exceeds the ${env.maxPagesPerDoc}-page limit.`,
    );
  }

  return {
    text,
    pageCount,
  };
}

async function buildChunkRecords(chunks) {
  if (env.retrievalMode !== 'vector') {
    return chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: null,
    }));
  }

  const embeddings = [];
  const batches = splitIntoBatches(chunks, 24);

  try {
    for (const batch of batches) {
      const vectors = await geminiService.embedTexts(batch.map((chunk) => chunk.content));
      for (let index = 0; index < batch.length; index += 1) {
        embeddings.push({
          chunkIndex: batch[index].chunkIndex,
          content: batch[index].content,
          embedding: vectors[index],
        });
      }
    }
  } catch (error) {
    logger.warn('Gemini embeddings unavailable, storing chunks without vectors', {
      model: env.geminiEmbeddingModel,
      code: error.code,
      message: error.message,
    });

    return chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: null,
    }));
  }

  return embeddings;
}

function getRetryAttemptCount(lastError) {
  const match = String(lastError || '').match(/^Retrying automatically \(attempt (\d+)\/(\d+)\)\./i);
  return match ? Number(match[1]) || 0 : 0;
}

function isRetryableProcessingError(error) {
  if (error instanceof AppError) {
    if (error.status >= 500) {
      return true;
    }

    return error.code === 'AI_TEMPORARILY_UNAVAILABLE' || error.code === 'STORAGE_DOWNLOAD_FAILED';
  }

  return true;
}

function getRetryDelayMs(nextAttempt) {
  return Math.min(
    env.documentProcessingRetryAfterMs * Math.max(1, nextAttempt),
    env.documentProcessingRetryAfterMs * env.documentProcessingMaxRetries,
  );
}

function formatRetryMessage(nextAttempt, error) {
  const message = String(error?.message || 'Document processing failed.');
  return `${RETRY_PREFIX} (attempt ${nextAttempt}/${env.documentProcessingMaxRetries}). Last error: ${message}`;
}

function formatFinalFailureMessage(attemptCount, error) {
  const message = String(error?.message || 'Document processing failed.');
  return `Processing failed after ${attemptCount} attempt${attemptCount === 1 ? '' : 's'}. Last error: ${message}`;
}

async function claimNextProcessingDocument() {
  return db.withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id,
              user_id,
              file_name,
              storage_path,
              last_error
       FROM documents
       WHERE status = 'processing'
         AND (
         processing_started_at IS NULL
           OR processing_started_at < NOW() - ($1 * interval '1 millisecond')
         )
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [env.documentProcessingRetryAfterMs],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const document = result.rows[0];

    const claimedResult = await client.query(
      `UPDATE documents
       SET processing_started_at = NOW()
       WHERE id = $1
       RETURNING id,
                 user_id,
                 file_name,
                 storage_path,
                 last_error`,
      [document.id],
    );

    return claimedResult.rows[0] || null;
  });
}

async function markDocumentIndexed(documentId, pageCount, chunkRecords) {
  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);

    if (chunkRecords.length > 0) {
      const values = [];
      const placeholders = [];

      chunkRecords.forEach((chunk, index) => {
        const offset = index * 4;
        const vectorLiteral = chunk.embedding
          ? toVectorLiteral(chunk.embedding, env.embeddingDimension)
          : null;

        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector)`);
        values.push(documentId, chunk.chunkIndex, chunk.content, vectorLiteral);
      });

      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content, embedding)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    await client.query(
      `UPDATE documents
       SET status = 'indexed',
           page_count = $2,
           chunk_count = $3,
           last_error = NULL,
           processing_started_at = NULL,
           indexed_at = NOW()
       WHERE id = $1`,
      [documentId, pageCount, chunkRecords.length],
    );
  });
}

async function markDocumentFailed(documentId, error) {
  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);
    await client.query(
      `UPDATE documents
       SET status = 'failed',
           page_count = 0,
           chunk_count = 0,
           last_error = $2,
           processing_started_at = NULL,
           indexed_at = NULL
       WHERE id = $1`,
      [documentId, String(error?.message || 'Document processing failed.')],
    );
  });
}

async function scheduleDocumentRetry(document, error, nextAttempt) {
  const retryDelayMs = getRetryDelayMs(nextAttempt);
  const retryEligibleAt = new Date(
    Date.now() - env.documentProcessingRetryAfterMs + retryDelayMs,
  );

  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM chunks WHERE document_id = $1', [document.id]);
    await client.query(
      `UPDATE documents
       SET status = 'processing',
           page_count = 0,
           chunk_count = 0,
           last_error = $2,
           processing_started_at = $3,
           indexed_at = NULL
       WHERE id = $1`,
      [document.id, formatRetryMessage(nextAttempt, error), retryEligibleAt],
    );
  });

  logger.warn('Document indexing scheduled for retry', {
    documentId: document.id,
    attempt: nextAttempt,
    maxRetries: env.documentProcessingMaxRetries,
    retryDelayMs,
    code: error?.code,
    message: error?.message,
  });
}

async function processClaimedDocument(document) {
  try {
    const buffer = await storageService.downloadDocumentBuffer(document.storage_path);
    const { text, pageCount } = await extractPdfData(buffer);
    const chunks = chunkText(text, env.chunkSizeTokens, env.chunkOverlapTokens);

    if (chunks.length === 0) {
      throw badRequest('No indexable content found after chunking.');
    }

    if (chunks.length > env.maxChunksPerDoc) {
      throw new AppError(
        400,
        'MAX_CHUNKS_EXCEEDED',
        `Document exceeds the ${env.maxChunksPerDoc}-chunk limit.`,
      );
    }

    const chunkRecords = await buildChunkRecords(chunks);
    await markDocumentIndexed(document.id, pageCount, chunkRecords);

    logger.info('Document indexed', {
      documentId: document.id,
      pageCount,
      chunkCount: chunkRecords.length,
    });
  } catch (error) {
    const previousAttemptCount = getRetryAttemptCount(document.last_error);
    const nextAttempt = previousAttemptCount + 1;
    const shouldRetry =
      isRetryableProcessingError(error) &&
      nextAttempt < env.documentProcessingMaxRetries;

    if (shouldRetry) {
      await scheduleDocumentRetry(document, error, nextAttempt);
      return;
    }

    await markDocumentFailed(document.id, {
      message: formatFinalFailureMessage(nextAttempt, error),
    });
    logger.warn('Document indexing failed permanently', {
      documentId: document.id,
      attempt: nextAttempt,
      maxRetries: env.documentProcessingMaxRetries,
      code: error.code,
      message: error.message,
    });
  }
}

async function processNextPendingDocument() {
  const document = await claimNextProcessingDocument();

  if (!document) {
    return false;
  }

  await processClaimedDocument(document);
  return true;
}

async function drainPendingDocuments() {
  if (draining) {
    return;
  }

  draining = true;

  try {
    while (await processNextPendingDocument()) {
      // Continue until the queue is empty.
    }
  } catch (error) {
    logger.error('Document worker cycle failed', {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    draining = false;
  }
}

function startDocumentWorker() {
  if (intervalHandle) {
    return;
  }

  intervalHandle = setInterval(() => {
    drainPendingDocuments().catch((error) => {
      logger.error('Document worker tick failed', {
        message: error.message,
      });
    });
  }, env.workerPollIntervalMs);

  logger.info('Document worker started', {
    pollIntervalMs: env.workerPollIntervalMs,
  });

  drainPendingDocuments().catch((error) => {
    logger.error('Initial document worker drain failed', {
      message: error.message,
    });
  });
}

function stopDocumentWorker() {
  if (!intervalHandle) {
    return;
  }

  clearInterval(intervalHandle);
  intervalHandle = null;
  draining = false;
}

module.exports = {
  processNextPendingDocument,
  startDocumentWorker,
  stopDocumentWorker,
};
