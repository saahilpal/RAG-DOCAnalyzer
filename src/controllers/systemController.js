const env = require('../config/env');
const { ok, fail } = require('../utils/apiResponse');
const { getReadinessStatus } = require('../services/healthService');

function live(_req, res) {
  return ok(res, {
    status: 'live',
    service: 'document-analyzer-rag-backend',
    timestamp: new Date().toISOString(),
  });
}

async function ready(_req, res) {
  const status = await getReadinessStatus();

  if (!status.database) {
    return fail(res, 503, 'NOT_READY_DATABASE', 'Database readiness check failed.', {
      database: status.database,
      ai: status.ai,
      timestamp: new Date().toISOString(),
    });
  }

  if (!status.ai) {
    return ok(res, {
      status: 'ready_degraded',
      mode: 'fallback',
      database: status.database,
      ai: status.ai,
      timestamp: new Date().toISOString(),
    });
  }

  return ok(res, {
    status: 'ready',
    mode: 'full',
    database: status.database,
    ai: status.ai,
    timestamp: new Date().toISOString(),
  });
}

function limits(_req, res) {
  return ok(res, {
    philosophy: 'This public demo runs on free-tier AI APIs, so usage limits apply.',
    retrievalMode: env.retrievalMode,
    limits: {
      maxFileSizeMb: env.maxFileSizeMb,
      maxPagesPerDoc: env.maxPagesPerDoc,
      maxChunksPerDoc: env.maxChunksPerDoc,
      maxContextChunks: env.maxContextChunks,
      maxChatRequestsPerDay: env.maxChatRequestsPerDay,
      maxDocsPerUser: env.maxDocsPerUser,
      cacheTtlSeconds: env.cacheTtlSeconds,
    },
    links: {
      githubRepositoryUrl: env.githubRepositoryUrl,
      runLocallyGuideUrl: env.runLocallyGuideUrl,
    },
  });
}

module.exports = {
  live,
  ready,
  limits,
};
