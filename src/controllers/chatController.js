const { ok } = require('../utils/apiResponse');
const { initSse, sendEvent, endSse } = require('../utils/sse');
const { getOwnedDocument } = require('../services/documentService');
const {
  ensureSession,
  saveMessage,
  listSessions,
  listSessionMessages,
} = require('../services/sessionService');
const { streamRagAnswer } = require('../services/ragService');
const env = require('../config/env');
const {
  consumeUserChatQuota,
  refundUserChatQuota,
  getRemainingChatRequests,
  getTodayChatUsage,
} = require('../services/quotaService');

async function stream(req, res, next) {
  const userId = req.auth.userId;
  const { sessionId, documentId, query } = req.body;

  let streamStarted = false;
  let quotaConsumed = false;
  let clientDisconnected = false;

  req.on('close', () => {
    clientDisconnected = true;
  });

  try {
    await getOwnedDocument({ userId, documentId });

    const session = await ensureSession({
      userId,
      sessionId,
      documentId,
      query,
    });

    const quota = await consumeUserChatQuota(userId);
    quotaConsumed = true;

    await saveMessage({
      sessionId: session.id,
      role: 'user',
      content: query,
    });

    initSse(res);
    streamStarted = true;

    sendEvent(res, 'session', {
      sessionId: session.id,
      documentId: session.document_id,
      daily_limit: quota.limit,
      daily_remaining: quota.remaining,
    });

    const generation = await streamRagAnswer({
      userId,
      documentId,
      query,
      shouldAbort: () => clientDisconnected,
      onToken: (token) => {
        if (!clientDisconnected) {
          sendEvent(res, 'token', { text: token });
        }
      },
    });

    const assistantMessage = await saveMessage({
      sessionId: session.id,
      role: 'assistant',
      content: generation.answer,
      fallbackUsed: generation.fallbackUsed,
    });

    if (!clientDisconnected) {
      sendEvent(res, 'done', {
        sessionId: session.id,
        messageId: assistantMessage.id,
        retrievedChunks: generation.chunks.length,
        fallback_used: generation.fallbackUsed,
        cached: generation.cached,
        ai_error_code: generation.aiErrorCode,
        daily_limit: quota.limit,
        daily_remaining: quota.remaining,
      });
      endSse(res);
    }
  } catch (error) {
    if (quotaConsumed && !clientDisconnected) {
      try {
        await refundUserChatQuota(userId);
      } catch (refundError) {
        logger.error('Failed to refund quota after error', {
          userId,
          message: refundError.message,
        });
      }
    }

    if (error?.code === 'CLIENT_DISCONNECTED') {
      if (!clientDisconnected && !res.writableEnded) {
        endSse(res);
      }
      return;
    }

    if (!streamStarted) {
      return next(error);
    }

    sendEvent(res, 'error', {
      code: error.code || 'STREAM_ERROR',
      message: error.message || 'Failed to stream response.',
      details: error.details || null,
    });

    return endSse(res);
  }
}

async function sessions(req, res) {
  const rows = await listSessions({
    userId: req.auth.userId,
    documentId: req.query.documentId || null,
    limit: req.query.limit || env.ragHistoryLimit,
  });

  return ok(res, { sessions: rows });
}

async function messages(req, res) {
  const rows = await listSessionMessages({
    userId: req.auth.userId,
    sessionId: req.params.sessionId,
  });

  return ok(res, { messages: rows });
}

async function quota(req, res) {
  const used = await getTodayChatUsage(req.auth.userId);
  const remaining = getRemainingChatRequests(used);

  return ok(res, {
    quota: {
      used,
      remaining,
      limit: env.maxChatRequestsPerDay,
    },
  });
}

module.exports = {
  stream,
  sessions,
  messages,
  quota,
};
