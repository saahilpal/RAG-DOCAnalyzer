const db = require('../database/client');
const env = require('../config/env');

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function getCachedAnswer({ documentId, query }) {
  const normalizedQuery = normalizeQuery(query);

  const result = await db.query(
    `SELECT answer, fallback_used, source_chunks, expires_at
     FROM query_cache
     WHERE document_id = $1
       AND normalized_query = $2
       AND expires_at > NOW()
     LIMIT 1`,
    [documentId, normalizedQuery],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    answer: result.rows[0].answer,
    fallbackUsed: Boolean(result.rows[0].fallback_used),
    sourceChunks: Array.isArray(result.rows[0].source_chunks) ? result.rows[0].source_chunks : [],
  };
}

async function setCachedAnswer({ documentId, query, answer, fallbackUsed, sourceChunks = [] }) {
  const normalizedQuery = normalizeQuery(query);
  const ttlSeconds = env.cacheTtlSeconds;

  await db.query(
    `INSERT INTO query_cache (document_id, normalized_query, answer, fallback_used, source_chunks, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW() + make_interval(secs => $6))
     ON CONFLICT (document_id, normalized_query)
     DO UPDATE SET
       answer = EXCLUDED.answer,
       fallback_used = EXCLUDED.fallback_used,
       source_chunks = EXCLUDED.source_chunks,
       created_at = NOW(),
       expires_at = EXCLUDED.expires_at`,
    [documentId, normalizedQuery, answer, fallbackUsed, JSON.stringify(sourceChunks), ttlSeconds],
  );

  // Opportunistic cleanup to keep cache table bounded in demo deployments.
  if (Math.random() < 0.1) {
    await cleanupExpiredCache();
  }
}

async function cleanupExpiredCache() {
  await db.query('DELETE FROM query_cache WHERE expires_at <= NOW()');
}

module.exports = {
  normalizeQuery,
  getCachedAnswer,
  setCachedAnswer,
  cleanupExpiredCache,
};
