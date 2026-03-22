const crypto = require('crypto');

const env = require('../config/env');
const logger = require('../config/logger');
const db = require('../database/client');
const { AppError, badRequest } = require('../utils/errors');
const chatService = require('./chatService');
const storageService = require('./storageService');

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
      `Document exceeds the ${env.maxFileSizeMb}MB upload limit.`,
    );
  }

  const signature = file.buffer.subarray(0, 5).toString('utf8');
  if (signature !== '%PDF-') {
    throw badRequest('Uploaded file is not a valid PDF.');
  }
}

function createDocumentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sanitizeDocumentRecord(record) {
  if (!record) {
    return record;
  }

  return {
    ...record,
    file_url: '',
  };
}

async function getOwnedDocument({ userId, documentId }) {
  const result = await db.query(
    `SELECT id,
            user_id,
            file_name,
            storage_path,
            file_url,
            document_hash,
            status,
            page_count,
            chunk_count,
            last_error,
            created_at,
            indexed_at
     FROM documents
     WHERE id = $1
       AND user_id = $2
     LIMIT 1`,
    [documentId, userId],
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  }

  return sanitizeDocumentRecord(result.rows[0]);
}

async function findUserDocumentByHash(userId, documentHash) {
  const result = await db.query(
    `SELECT id,
            user_id,
            file_name,
            storage_path,
            file_url,
            document_hash,
            status,
            page_count,
            chunk_count,
            last_error,
            created_at,
            indexed_at
     FROM documents
     WHERE user_id = $1
       AND document_hash = $2
     LIMIT 1`,
    [userId, documentHash],
  );

  return sanitizeDocumentRecord(result.rows[0] || null);
}

async function isDocumentAttachedToChat(chatId, documentId) {
  const result = await db.query(
    `SELECT 1
     FROM chat_documents
     WHERE chat_id = $1
       AND document_id = $2
     LIMIT 1`,
    [chatId, documentId],
  );

  return result.rowCount > 0;
}

async function countChatDocuments(chatId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM chat_documents
     WHERE chat_id = $1`,
    [chatId],
  );

  return result.rows[0]?.count || 0;
}

async function assertChatAttachmentCapacity(chatId, existingDocumentId = null) {
  if (existingDocumentId && (await isDocumentAttachedToChat(chatId, existingDocumentId))) {
    return { alreadyAttached: true };
  }

  const count = await countChatDocuments(chatId);
  if (count >= env.maxDocsPerChat) {
    throw new AppError(
      409,
      'ATTACHMENT_LIMIT_REACHED',
      `Each chat can include up to ${env.maxDocsPerChat} documents.`,
    );
  }

  return { alreadyAttached: false };
}

async function requeueDocument(documentId) {
  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);
    await client.query(
      `UPDATE documents
       SET status = 'processing',
           page_count = 0,
           chunk_count = 0,
           last_error = NULL,
           processing_started_at = NULL,
           indexed_at = NULL
       WHERE id = $1`,
      [documentId],
    );
  });
}

async function attachExistingDocumentToChat({ userId, chatId, document }) {
  const { alreadyAttached } = await assertChatAttachmentCapacity(chatId, document.id);

  if (!alreadyAttached) {
    await db.query(
      `INSERT INTO chat_documents (chat_id, document_id)
       VALUES ($1, $2)
       ON CONFLICT (chat_id, document_id) DO NOTHING`,
      [chatId, document.id],
    );
  }

  if (document.status === 'failed' || document.status === 'uploading') {
    await requeueDocument(document.id);
  }

  return getOwnedDocument({ userId, documentId: document.id });
}

async function attachDocumentToChat({ userId, chatId, file }) {
  await chatService.getOwnedChat({ userId, chatId });
  validatePdfFile(file);

  const documentHash = createDocumentHash(file.buffer);
  const existing = await findUserDocumentByHash(userId, documentHash);

  if (existing) {
    return attachExistingDocumentToChat({
      userId,
      chatId,
      document: existing,
    });
  }

  await assertChatAttachmentCapacity(chatId);

  const { storagePath, fileUrl } = await storageService.uploadDocumentBuffer({
    userId,
    originalName: file.originalname,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });

  try {
    const result = await db.withTransaction(async (client) => {
      const documentResult = await client.query(
        `INSERT INTO documents (
            user_id,
            file_name,
            storage_path,
            file_url,
            document_hash,
            status
         )
         VALUES ($1, $2, $3, $4, $5, 'uploading')
         RETURNING id,
                   user_id,
                   file_name,
                   storage_path,
                   file_url,
                   document_hash,
                   status,
                   page_count,
                   chunk_count,
                   last_error,
                   created_at,
                   indexed_at`,
        [userId, file.originalname, storagePath, fileUrl, documentHash],
      );

      const document = documentResult.rows[0];

      await client.query(
        `INSERT INTO chat_documents (chat_id, document_id)
         VALUES ($1, $2)`,
        [chatId, document.id],
      );

      const updatedResult = await client.query(
        `UPDATE documents
         SET status = 'processing'
         WHERE id = $1
         RETURNING id,
                   user_id,
                   file_name,
                   storage_path,
                   file_url,
                   document_hash,
                   status,
                   page_count,
                   chunk_count,
                   last_error,
                   created_at,
                   indexed_at`,
        [document.id],
      );

      return updatedResult.rows[0];
    });

    return sanitizeDocumentRecord(result);
  } catch (error) {
    try {
      await storageService.deleteDocumentObject(storagePath);
    } catch (cleanupError) {
      logger.error('Failed to cleanup storage after document attach failure', {
        storagePath,
        message: cleanupError.message,
      });
    }

    throw error;
  }
}

async function listChatDocuments({ userId, chatId }) {
  await chatService.getOwnedChat({ userId, chatId });

  const result = await db.query(
    `SELECT d.id,
            d.file_name,
            d.file_url,
            d.status,
            d.page_count,
            d.chunk_count,
            d.last_error,
            d.created_at,
            d.indexed_at,
            cd.attached_at
     FROM chat_documents cd
     JOIN documents d ON d.id = cd.document_id
     JOIN chats c ON c.id = cd.chat_id
     WHERE cd.chat_id = $1
       AND c.user_id = $2
     ORDER BY cd.attached_at ASC`,
    [chatId, userId],
  );

  return result.rows.map((row) => sanitizeDocumentRecord(row));
}

async function removeDocumentFromChat({ userId, chatId, documentId }) {
  await chatService.getOwnedChat({ userId, chatId });

  const document = await getOwnedDocument({ userId, documentId });
  const attachmentResult = await db.query(
    `SELECT 1
     FROM chat_documents
     WHERE chat_id = $1
       AND document_id = $2
     LIMIT 1`,
    [chatId, documentId],
  );

  if (attachmentResult.rowCount === 0) {
    throw new AppError(404, 'DOCUMENT_NOT_ATTACHED', 'Document is not attached to this chat.');
  }

  await db.query(
    `DELETE FROM chat_documents
     WHERE chat_id = $1
       AND document_id = $2`,
    [chatId, documentId],
  );

  const remainingResult = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM chat_documents
     WHERE document_id = $1`,
    [documentId],
  );

  if ((remainingResult.rows[0]?.count || 0) === 0) {
    await db.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [documentId, userId]);

    try {
      await storageService.deleteDocumentObject(document.storage_path);
    } catch (error) {
      logger.error('Failed to delete storage object after detaching final document', {
        documentId,
        storagePath: document.storage_path,
        message: error.message,
      });
    }
  }

  return { id: documentId };
}

module.exports = {
  validatePdfFile,
  createDocumentHash,
  getOwnedDocument,
  attachDocumentToChat,
  listChatDocuments,
  removeDocumentFromChat,
};
