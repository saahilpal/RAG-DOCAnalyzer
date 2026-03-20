const db = require('../database/client');
const env = require('../config/env');
const { AppError } = require('../utils/errors');
const quotaService = require('./quotaService');

function buildChatTitle(content) {
  const title = String(content || '').trim();
  if (!title) {
    return 'New Chat';
  }

  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

async function createChat({ userId, title }) {
  const result = await db.query(
    `INSERT INTO chats (user_id, title, pinned)
     VALUES ($1, $2, FALSE)
     RETURNING id, user_id, title, pinned, created_at, updated_at`,
    [userId, title || 'New Chat'],
  );

  return result.rows[0];
}

async function listChats({ userId, limit = 50 }) {
  const result = await db.query(
    `SELECT c.id,
            c.title,
            c.pinned,
            c.created_at,
            c.updated_at,
            lm.content AS last_message,
            lm.created_at AS last_message_at,
            COALESCE(dc.attachment_count, 0)::int AS attachment_count
     FROM chats c
     LEFT JOIN LATERAL (
       SELECT content, created_at
       FROM messages
       WHERE chat_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS attachment_count
       FROM chat_documents
       WHERE chat_id = c.id
     ) dc ON TRUE
     WHERE c.user_id = $1
     ORDER BY c.pinned DESC, c.updated_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows;
}

async function getOwnedChat({ userId, chatId }) {
  const result = await db.query(
    `SELECT id, user_id, title, pinned, created_at, updated_at
     FROM chats
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [chatId, userId],
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found.');
  }

  return result.rows[0];
}

async function updateOwnedChat({ userId, chatId, title, pinned }) {
  const updates = [];
  const params = [chatId, userId];
  let index = 3;

  if (title !== undefined) {
    updates.push(`title = $${index}`);
    params.push(title);
    index += 1;
  }

  if (pinned !== undefined) {
    updates.push(`pinned = $${index}`);
    params.push(Boolean(pinned));
    index += 1;
  }

  updates.push('updated_at = NOW()');

  const result = await db.query(
    `UPDATE chats
     SET ${updates.join(', ')}
     WHERE id = $1
       AND user_id = $2
     RETURNING id, user_id, title, pinned, created_at, updated_at`,
    params,
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found.');
  }

  return result.rows[0];
}

async function deleteOwnedChat({ userId, chatId }) {
  const result = await db.query(
    `DELETE FROM chats
     WHERE id = $1
       AND user_id = $2
     RETURNING id`,
    [chatId, userId],
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat not found.');
  }

  return { id: result.rows[0].id };
}

async function listChatMessages({ userId, chatId, limit = env.chatMessageListLimit }) {
  await getOwnedChat({ userId, chatId });

  const result = await db.query(
    `SELECT id, chat_id, role, content, client_message_id, created_at
     FROM (
       SELECT id, chat_id, role, content, client_message_id, created_at
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent_messages
     ORDER BY created_at ASC`,
    [chatId, limit],
  );

  return result.rows;
}

async function getRecentChatMessages({ userId, chatId, limit = env.chatHistoryLimit }) {
  await getOwnedChat({ userId, chatId });

  const result = await db.query(
    `SELECT role, content, created_at
     FROM (
       SELECT role, content, created_at
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent_messages
     ORDER BY created_at ASC`,
    [chatId, limit],
  );

  return result.rows;
}

async function createUserMessage({ userId, chatId, content, clientMessageId }) {
  return db.withTransaction(async (client) => {
    const insertResult = await client.query(
      `INSERT INTO messages (chat_id, role, content, client_message_id)
       VALUES ($1, 'user', $2, $3)
       ON CONFLICT (chat_id, client_message_id) DO NOTHING
       RETURNING id, chat_id, role, content, client_message_id, created_at`,
      [chatId, content, clientMessageId],
    );

    if (insertResult.rowCount === 0) {
      throw new AppError(409, 'DUPLICATE_MESSAGE', 'This message request has already been processed.');
    }

    const message = insertResult.rows[0];

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM messages
       WHERE chat_id = $1
         AND role = 'user'`,
      [chatId],
    );

    if ((countResult.rows[0]?.count || 0) === 1) {
      await client.query(
        `UPDATE chats
         SET title = $2
         WHERE id = $1
           AND user_id = $3
           AND title = 'New Chat'`,
        [chatId, buildChatTitle(content), userId],
      );
    }

    await client.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

    return message;
  });
}

async function saveAssistantMessageAndConsumeQuota({ userId, chatId, content }) {
  return db.withTransaction(async (client) => {
    const messageResult = await client.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING id, chat_id, role, content, client_message_id, created_at`,
      [chatId, content],
    );

    await client.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);
    const quota = await quotaService.recordSuccessfulRequest(userId, client);

    return {
      message: messageResult.rows[0],
      quota,
    };
  });
}

module.exports = {
  buildChatTitle,
  createChat,
  listChats,
  getOwnedChat,
  updateOwnedChat,
  deleteOwnedChat,
  listChatMessages,
  getRecentChatMessages,
  createUserMessage,
  saveAssistantMessageAndConsumeQuota,
};
