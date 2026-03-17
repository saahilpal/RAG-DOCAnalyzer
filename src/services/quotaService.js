const db = require('../database/client');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

async function getTodayChatUsageFromMessages(userId, client = db) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM messages m
     JOIN sessions s ON s.id = m.session_id
     WHERE s.user_id = $1
       AND m.role = 'user'
       AND m.created_at >= date_trunc('day', NOW())
       AND m.created_at < date_trunc('day', NOW()) + interval '1 day'`,
    [userId],
  );

  return result.rows[0]?.count || 0;
}

async function getTodayChatUsage(userId, client = db) {
  const usageResult = await client.query(
    `SELECT request_count::int AS count
     FROM daily_chat_usage
     WHERE user_id = $1
       AND usage_date = CURRENT_DATE
     LIMIT 1`,
    [userId],
  );

  if (usageResult.rowCount > 0) {
    return usageResult.rows[0]?.count || 0;
  }

  const messageCount = await getTodayChatUsageFromMessages(userId, client);

  if (messageCount > 0) {
    await client.query(
      `INSERT INTO daily_chat_usage (user_id, usage_date, request_count, updated_at)
       VALUES ($1, CURRENT_DATE, $2, NOW())
       ON CONFLICT (user_id, usage_date) DO NOTHING`,
      [userId, messageCount],
    );
  }

  return messageCount;
}

function getRemainingChatRequests(countUsed) {
  return Math.max(0, env.maxChatRequestsPerDay - countUsed);
}

async function assertUserChatQuota(userId) {
  const countUsed = await getTodayChatUsage(userId);
  const remaining = getRemainingChatRequests(countUsed);

  if (remaining <= 0) {
    throw new AppError(429, 'CHAT_DAILY_LIMIT_REACHED', 'Daily chat limit reached for demo environment.', {
      limit: env.maxChatRequestsPerDay,
      reset: 'daily',
    });
  }

  return {
    used: countUsed,
    remaining,
    limit: env.maxChatRequestsPerDay,
  };
}

async function consumeUserChatQuota(userId) {
  return db.withTransaction(async (client) => {
    const consumeResult = await client.query(
      `INSERT INTO daily_chat_usage (user_id, usage_date, request_count, updated_at)
       VALUES ($1, CURRENT_DATE, 1, NOW())
       ON CONFLICT (user_id, usage_date)
       DO UPDATE
       SET request_count = daily_chat_usage.request_count + 1,
           updated_at = NOW()
       WHERE daily_chat_usage.request_count < $2
       RETURNING request_count::int AS count`,
      [userId, env.maxChatRequestsPerDay],
    );

    if (consumeResult.rowCount === 0) {
      const used = await getTodayChatUsage(userId, client);
      throw new AppError(429, 'CHAT_DAILY_LIMIT_REACHED', 'Daily chat limit reached for demo environment.', {
        limit: env.maxChatRequestsPerDay,
        used,
        reset: 'daily',
      });
    }

    const used = consumeResult.rows[0]?.count || 0;
    return {
      used,
      remaining: getRemainingChatRequests(used),
      limit: env.maxChatRequestsPerDay,
    };
  });
}

module.exports = {
  getTodayChatUsage,
  consumeUserChatQuota,
  getRemainingChatRequests,
  assertUserChatQuota,
};
