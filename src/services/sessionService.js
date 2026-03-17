const env = require('../config/env');
const db = require('../database/client');
const { badRequest, notFound } = require('../utils/errors');

function buildSessionTitle(query) {
  const title = String(query || '').trim();
  if (!title) {
    return 'New Chat';
  }
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

async function createSession({ userId, documentId, title }) {
  const result = await db.query(
    `INSERT INTO sessions (user_id, document_id, title)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, document_id, title, created_at, updated_at`,
    [userId, documentId, title || 'New Chat'],
  );

  return result.rows[0];
}

async function getSessionById({ userId, sessionId }) {
  const result = await db.query(
    `SELECT id, user_id, document_id, title, created_at, updated_at
     FROM sessions
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [sessionId, userId],
  );

  if (result.rowCount === 0) {
    throw notFound('Session not found.');
  }

  return result.rows[0];
}

async function ensureSession({ userId, sessionId, documentId, query }) {
  if (!sessionId) {
    return createSession({
      userId,
      documentId,
      title: buildSessionTitle(query),
    });
  }

  const existing = await getSessionById({ userId, sessionId });

  if (existing.document_id !== documentId) {
    throw badRequest('Provided session does not belong to the selected document.');
  }

  return existing;
}

async function saveMessage({ sessionId, role, content, fallbackUsed = false }) {
  const result = await db.withTransaction(async (client) => {
    const messageResult = await client.query(
      `INSERT INTO messages (session_id, role, content, fallback_used)
       VALUES ($1, $2, $3, $4)
       RETURNING id, session_id, role, content, fallback_used, created_at`,
      [sessionId, role, content, fallbackUsed],
    );

    await client.query('UPDATE sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);

    return messageResult.rows[0];
  });

  return result;
}

async function listSessions({ userId, documentId = null, limit = 50 }) {
  const result = await db.query(
    `SELECT s.id,
            s.document_id,
            s.title,
            s.created_at,
            s.updated_at,
            lm.role AS last_role,
            lm.content AS last_message
     FROM sessions s
     LEFT JOIN LATERAL (
       SELECT role, content
       FROM messages
       WHERE session_id = s.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON TRUE
     WHERE s.user_id = $1
       AND ($2::uuid IS NULL OR s.document_id = $2::uuid)
     ORDER BY s.updated_at DESC
     LIMIT $3`,
    [userId, documentId, limit],
  );

  return result.rows;
}

async function listSessionMessages({ userId, sessionId }) {
  await getSessionById({ userId, sessionId });

  const result = await db.query(
    `SELECT id, session_id, role, content, fallback_used, created_at
     FROM (
       SELECT id, session_id, role, content, fallback_used, created_at
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent_messages
     ORDER BY created_at ASC`,
    [sessionId, env.ragHistoryLimit],
  );

  return result.rows;
}

module.exports = {
  ensureSession,
  saveMessage,
  listSessions,
  listSessionMessages,
  getSessionById,
};
