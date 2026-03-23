const db = require('../database/client');
const { checkGeminiReady } = require('./geminiService');

const AI_HEALTH_CACHE_TTL_MS = 60_000;

let aiHealthCache = {
  value: false,
  checkedAt: 0,
};

async function checkDatabaseReady() {
  try {
    const result = await db.query('SELECT 1 AS ok');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}

async function checkAiReadyCached() {
  const now = Date.now();
  if (now - aiHealthCache.checkedAt < AI_HEALTH_CACHE_TTL_MS) {
    return aiHealthCache.value;
  }

  const value = await checkGeminiReady();
  aiHealthCache = {
    value,
    checkedAt: now,
  };

  return value;
}

async function getReadinessStatus() {
  const [database, ai] = await Promise.all([checkDatabaseReady(), checkAiReadyCached()]);

  return {
    database,
    ai,
    ready: database && ai,
  };
}

module.exports = {
  checkDatabaseReady,
  checkAiReadyCached,
  getReadinessStatus,
};
