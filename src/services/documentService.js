const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const env = require('../config/env');
const logger = require('../config/logger');
const db = require('../database/client');
const { chunkText } = require('../utils/chunkText');
const { toVectorLiteral } = require('../utils/vector');
const { AppError, badRequest, notFound } = require('../utils/errors');
const { uploadDocumentBuffer, deleteDocumentObject } = require('./storageService');
const { embedTexts } = require('./geminiService');

function validatePdfFile(file) {
  if (!file) {
    throw badRequest('A PDF file is required.');
  }

  const originalName = String(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (!originalName.endsWith('.pdf')) {
    throw badRequest('Only .pdf files are supported.');
  }

  if (mimeType && mimeType !== 'application/pdf') {
    throw badRequest('Invalid file type. Expected application/pdf.');
  }

  if (!Buffer.isBuffer(file.buffer)) {
    throw badRequest('File payload is invalid.');
  }

  if (file.size > env.maxUploadFileSizeBytes) {
    throw new AppError(
      413,
      'FILE_TOO_LARGE',
      `Document exceeds ${env.maxFileSizeMb}MB limit for demo environment.`,
    );
  }

  const signature = file.buffer.subarray(0, 5).toString('utf8');
  if (signature !== '%PDF-') {
    throw badRequest('Uploaded file is not a valid PDF.');
  }
}

function splitIntoBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

function createDocumentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function buildTextPreview(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
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
      `Document exceeds ${env.maxPagesPerDoc} pages allowed in demo environment.`,
    );
  }

  return {
    text,
    pageCount,
  };
}

async function assertUserDocumentLimit(userId, bypassDocumentLimit = false) {
  if (bypassDocumentLimit) {
    return;
  }

  const result = await db.query('SELECT COUNT(*)::int AS count FROM documents WHERE user_id = $1', [userId]);
  const count = result.rows[0]?.count || 0;

  if (count >= env.maxDocsPerUser) {
    throw new AppError(
      400,
      'MAX_DOCUMENTS_REACHED',
      `You can upload up to ${env.maxDocsPerUser} documents in this demo environment.`,
    );
  }
}

async function findDocumentByHashForUser(userId, documentHash) {
  const result = await db.query(
    `SELECT id,
            user_id,
            file_name,
            file_url,
            page_count,
            chunk_count,
            indexing_status,
            text_preview,
            created_at
     FROM documents
     WHERE user_id = $1
       AND document_hash = $2
     LIMIT 1`,
    [userId, documentHash],
  );

  return result.rows[0] || null;
}

async function findReusableDocumentByHash(documentHash) {
  const result = await db.query(
    `SELECT id, file_name, page_count, chunk_count, text_preview
     FROM documents
     WHERE document_hash = $1
       AND indexing_status = 'indexed'
       AND chunk_count > 0
     ORDER BY created_at ASC
     LIMIT 1`,
    [documentHash],
  );

  return result.rows[0] || null;
}

async function insertDocumentWithChunkReuse({ userId, file, documentHash, reusableDocument }) {
  const { storagePath, fileUrl } = await uploadDocumentBuffer({
    userId,
    originalName: file.originalname,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  try {
    const result = await db.withTransaction(async (client) => {
      const docResult = await client.query(
        `INSERT INTO documents (
            user_id,
            file_name,
            file_url,
            storage_path,
            document_hash,
            page_count,
            chunk_count,
            indexing_status,
            text_preview
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'indexed', $8)
         RETURNING id,
                   user_id,
                   file_name,
                   file_url,
                   page_count,
                   chunk_count,
                   indexing_status,
                   text_preview,
                   created_at`,
        [
          userId,
          file.originalname,
          fileUrl,
          storagePath,
          documentHash,
          reusableDocument.page_count,
          reusableDocument.chunk_count,
          reusableDocument.text_preview,
        ],
      );

      const document = docResult.rows[0];

      await client.query(
        `INSERT INTO chunks (document_id, content, chunk_index, embedding)
         SELECT $1, content, chunk_index, embedding
         FROM chunks
         WHERE document_id = $2
         ORDER BY chunk_index ASC`,
        [document.id, reusableDocument.id],
      );

      return document;
    });

    return {
      document: result,
      chunkCount: reusableDocument.chunk_count,
      deduplicated: true,
      reusedChunks: true,
    };
  } catch (error) {
    await deleteDocumentObject(storagePath).catch(() => {});
    throw error;
  }
}

async function buildChunkRecords(chunks) {
  if (env.retrievalMode !== 'vector') {
    return chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: null,
    }));
  }

  const chunkEmbeddings = [];
  const batches = splitIntoBatches(chunks, 24);

  for (const batch of batches) {
    const vectors = await embedTexts(batch.map((chunk) => chunk.content));
    for (let i = 0; i < batch.length; i += 1) {
      chunkEmbeddings.push({
        chunkIndex: batch[i].chunkIndex,
        content: batch[i].content,
        embedding: vectors[i],
      });
    }
  }

  return chunkEmbeddings;
}

async function uploadAndIndexDocument({ userId, file, bypassDocumentLimit = false }) {
  validatePdfFile(file);

  const documentHash = createDocumentHash(file.buffer);

  const sameUserDocument = await findDocumentByHashForUser(userId, documentHash);
  if (sameUserDocument) {
    return {
      document: sameUserDocument,
      chunkCount: sameUserDocument.chunk_count,
      deduplicated: true,
      reusedChunks: true,
    };
  }

  await assertUserDocumentLimit(userId, bypassDocumentLimit);

  const reusableDocument = await findReusableDocumentByHash(documentHash);
  if (reusableDocument) {
    return insertDocumentWithChunkReuse({
      userId,
      file,
      documentHash,
      reusableDocument,
    });
  }

  const { text, pageCount } = await extractPdfData(file.buffer);
  const chunks = chunkText(text, env.chunkSizeTokens, env.chunkOverlapTokens);

  if (chunks.length === 0) {
    throw badRequest('No indexable content found after chunking.');
  }

  if (chunks.length > env.maxChunksPerDoc) {
    throw new AppError(
      400,
      'MAX_CHUNKS_EXCEEDED',
      `Document exceeds ${env.maxChunksPerDoc} chunks allowed in demo environment.`,
    );
  }

  const chunkRecords = await buildChunkRecords(chunks);

  const { storagePath, fileUrl } = await uploadDocumentBuffer({
    userId,
    originalName: file.originalname,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  try {
    const result = await db.withTransaction(async (client) => {
      const docResult = await client.query(
        `INSERT INTO documents (
            user_id,
            file_name,
            file_url,
            storage_path,
            document_hash,
            page_count,
            chunk_count,
            indexing_status,
            text_preview
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'indexed', $8)
         RETURNING id,
                   user_id,
                   file_name,
                   file_url,
                   page_count,
                   chunk_count,
                   indexing_status,
                   text_preview,
                   created_at`,
        [
          userId,
          file.originalname,
          fileUrl,
          storagePath,
          documentHash,
          pageCount,
          chunkRecords.length,
          buildTextPreview(text),
        ],
      );

      const document = docResult.rows[0];

      if (chunkRecords.length > 0) {
        const values = [];
        const placeholders = [];
        chunkRecords.forEach((chunk, index) => {
          const offset = index * 4;
          const vectorLiteral = chunk.embedding
            ? toVectorLiteral(chunk.embedding, env.embeddingDimension)
            : null;

          placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector)`);
          values.push(document.id, chunk.content, chunk.chunkIndex, vectorLiteral);
        });

        await client.query(
          `INSERT INTO chunks (document_id, content, chunk_index, embedding)
           VALUES ${placeholders.join(', ')}`,
          values,
        );
      }

      return document;
    });

    return {
      document: result,
      chunkCount: chunkRecords.length,
      deduplicated: false,
      reusedChunks: false,
    };
  } catch (error) {
    try {
      await deleteDocumentObject(storagePath);
    } catch (cleanupError) {
      logger.error('Failed to cleanup storage after indexing error', {
        storagePath,
        message: cleanupError.message,
      });
    }

    throw error;
  }
}

async function listDocuments({ userId, limit = 50 }) {
  const result = await db.query(
    `SELECT id,
            file_name,
            file_url,
            page_count,
            chunk_count,
            indexing_status,
            text_preview,
            created_at
     FROM documents
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows;
}

async function getOwnedDocument({ userId, documentId }) {
  const result = await db.query(
    `SELECT id,
            user_id,
            file_name,
            file_url,
            storage_path,
            document_hash,
            page_count,
            chunk_count,
            indexing_status,
            text_preview,
            created_at
     FROM documents
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [documentId, userId],
  );

  if (result.rowCount === 0) {
    throw notFound('Document not found.');
  }

  return result.rows[0];
}

async function deleteDocument({ userId, documentId }) {
  const document = await getOwnedDocument({ userId, documentId });

  await db.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [documentId, userId]);

  try {
    await deleteDocumentObject(document.storage_path);
  } catch (error) {
    logger.error('Failed to delete storage object after DB delete', {
      documentId,
      storagePath: document.storage_path,
      message: error.message,
    });
  }

  return { id: documentId };
}

module.exports = {
  uploadAndIndexDocument,
  listDocuments,
  deleteDocument,
  getOwnedDocument,
};
