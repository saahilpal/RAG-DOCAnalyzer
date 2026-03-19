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
      mode: 'chat_only',
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
    philosophy: 'Chat-first RAG workspace with lightweight attachments and predictable operating limits.',
    retrievalMode: env.retrievalMode,
    workerEnabled: env.enableDocumentWorker,
    limits: {
      maxFileSizeMb: env.maxFileSizeMb,
      maxPagesPerDoc: env.maxPagesPerDoc,
      maxChunksPerDoc: env.maxChunksPerDoc,
      maxDocsPerChat: env.maxDocsPerChat,
      maxChatRequestsPerDay: env.maxChatRequestsPerDay,
      chatHistoryLimit: env.chatHistoryLimit,
      chatMessageListLimit: env.chatMessageListLimit,
      ragTopK: env.ragTopK,
      ragCandidatePageSize: env.ragCandidatePageSize,
      workerPollIntervalMs: env.workerPollIntervalMs,
      otpExpiresInSeconds: env.otpExpirySeconds,
      otpResendCooldownSeconds: env.otpResendCooldownSeconds,
      otpMaxAttempts: env.otpMaxAttempts,
      otpMaxRequestsPerHour: env.otpMaxRequestsPerHour,
      otpRequestIpRateLimitMax: env.otpRequestIpRateLimitMax,
      otpVerifyIpRateLimitMax: env.otpVerifyIpRateLimitMax,
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
