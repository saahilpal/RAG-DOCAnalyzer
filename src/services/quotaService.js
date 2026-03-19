const db = require('../database/client');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

async function getTodayChatUsage(userId, client = db) {
  const result = await client.query(
    `SELECT request_count::int AS count
     FROM daily_chat_usage
     WHERE user_id = $1
       AND usage_date = CURRENT_DATE
     LIMIT 1`,
    [userId],
  );

  return result.rows[0]?.count || 0;
}

function getRemainingChatRequests(countUsed) {
  return Math.max(0, env.maxChatRequestsPerDay - countUsed);
}

async function assertUserChatQuotaAvailable(userId) {
  const used = await getTodayChatUsage(userId);
  const remaining = getRemainingChatRequests(used);

  if (remaining <= 0) {
    throw new AppError(429, 'CHAT_DAILY_LIMIT_REACHED', 'Daily chat limit reached for this workspace.', {
      limit: env.maxChatRequestsPerDay,
      reset: 'daily',
    });
  }

  return {
    used,
    remaining,
    limit: env.maxChatRequestsPerDay,
  };
}

async function recordSuccessfulRequest(userId, client = db) {
  const result = await client.query(
    `INSERT INTO daily_chat_usage (user_id, usage_date, request_count, updated_at)
     VALUES ($1, CURRENT_DATE, 1, NOW())
     ON CONFLICT (user_id, usage_date)
     DO UPDATE
     SET request_count = LEAST($2, daily_chat_usage.request_count + 1),
         updated_at = NOW()
     RETURNING request_count::int AS count`,
    [userId, env.maxChatRequestsPerDay],
  );

  const used = result.rows[0]?.count || 0;

  return {
    used,
    remaining: getRemainingChatRequests(used),
    limit: env.maxChatRequestsPerDay,
  };
}

module.exports = {
  getTodayChatUsage,
  getRemainingChatRequests,
  assertUserChatQuotaAvailable,
  recordSuccessfulRequest,
};
