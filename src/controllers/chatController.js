const logger = require('../config/logger');
const env = require('../config/env');
const { ok } = require('../utils/apiResponse');
const { initSse, sendEvent, endSse } = require('../utils/sse');
const { AppError } = require('../utils/errors');
const chatService = require('../services/chatService');
const documentService = require('../services/documentService');
const ragService = require('../services/ragService');
const quotaService = require('../services/quotaService');

async function listChats(req, res) {
  const chats = await chatService.listChats({
    userId: req.auth.userId,
    limit: req.query.limit,
  });

  return ok(res, { chats });
}

async function createChat(req, res) {
  const chat = await chatService.createChat({
    userId: req.auth.userId,
    title: req.body.title,
  });

  return ok(res, { chat }, 201);
}

async function getChat(req, res) {
  const chat = await chatService.getOwnedChat({
    userId: req.auth.userId,
    chatId: req.params.chatId,
  });

  return ok(res, { chat });
}

async function updateChat(req, res) {
  const chat = await chatService.updateOwnedChat({
    userId: req.auth.userId,
    chatId: req.params.chatId,
    title: req.body.title,
    pinned: req.body.pinned,
  });

  return ok(res, { chat });
}

async function deleteChat(req, res) {
  const deleted = await chatService.deleteOwnedChat({
    userId: req.auth.userId,
    chatId: req.params.chatId,
  });

  return ok(res, { deleted });
}

async function listMessages(req, res) {
  const messages = await chatService.listChatMessages({
    userId: req.auth.userId,
    chatId: req.params.chatId,
    limit: req.query.limit || env.chatMessageListLimit,
  });

  return ok(res, { messages });
}

async function listDocuments(req, res) {
  const documents = await documentService.listChatDocuments({
    userId: req.auth.userId,
    chatId: req.params.chatId,
  });

  return ok(res, { documents });
}

async function uploadDocument(req, res) {
  const document = await documentService.attachDocumentToChat({
    userId: req.auth.userId,
    chatId: req.params.chatId,
    file: req.file,
  });

  return ok(res, { document }, 201);
}

async function removeDocument(req, res) {
  const deleted = await documentService.removeDocumentFromChat({
    userId: req.auth.userId,
    chatId: req.params.chatId,
    documentId: req.params.documentId,
  });

  return ok(res, { deleted });
}

async function streamMessage(req, res, next) {
  const userId = req.auth.userId;
  const chatId = req.params.chatId;
  const { content, clientMessageId } = req.body;

  let streamStarted = false;
  let clientDisconnected = false;
  let userMessageId = null;
  let assistantMessageSaved = false;

  req.on('close', () => {
    clientDisconnected = true;
  });

  async function cleanupFailedUserMessage() {
    if (!userMessageId || assistantMessageSaved) {
      return;
    }

    try {
      await chatService.removeFailedUserMessage({
        userId,
        chatId,
        messageId: userMessageId,
        content,
      });
    } catch (cleanupError) {
      logger.warn('Failed to cleanup interrupted chat message', {
        chatId,
        userId,
        userMessageId,
        message: cleanupError.message,
      });
    } finally {
      userMessageId = null;
    }
  }

  try {
    await quotaService.withChatQuotaLock(userId, async () => {
      await chatService.getOwnedChat({ userId, chatId });
      await quotaService.assertUserChatQuotaAvailable(userId);

      const attachedDocuments = await documentService.listChatDocuments({ userId, chatId });
      const indexedDocuments = attachedDocuments.filter((document) => document.status === 'indexed');
      const history = await chatService.getRecentChatMessages({
        userId,
        chatId,
        limit: env.chatHistoryLimit,
      });


      const userMessage = await chatService.createUserMessage({
        userId,
        chatId,
        content,
        clientMessageId,
      });
      userMessageId = userMessage.id;

      if (clientDisconnected) {
        await cleanupFailedUserMessage();
        return;
      }

      initSse(res);
      streamStarted = true;

      sendEvent(res, 'chat.meta', {
        chatId,
        userMessageId,
      });

      const generation = await ragService.streamAssistantReply({
        userId,
        chatId,
        history,
        indexedDocuments,
        userMessage: content,
        shouldAbort: () => clientDisconnected,
        onToken: (token) => {
          if (!clientDisconnected) {
            sendEvent(res, 'assistant.delta', { text: token });
          }
        },
      });

      if (clientDisconnected) {
        await cleanupFailedUserMessage();
        return;
      }

      const completion = await chatService.saveAssistantMessageAndConsumeQuota({
        userId,
        chatId,
        content: generation.answer,
      });
      assistantMessageSaved = true;

      sendEvent(res, 'assistant.completed', {
        assistantMessage: completion.message,
        quota: completion.quota,
      });

      endSse(res);
    });
  } catch (error) {
    if (error?.code === 'CLIENT_DISCONNECTED') {
      await cleanupFailedUserMessage();
      return;
    }

    if (!streamStarted) {
      await cleanupFailedUserMessage();
      return next(error);
    }

    await cleanupFailedUserMessage();

    logger.warn('Streaming message failed', {
      chatId,
      userId,
      userMessageId,
      code: error.code,
      message: error.message,
    });

    if (!res.writableEnded) {
      sendEvent(res, 'error', {
        code: error.code || 'STREAM_ABORTED',
        message: error.message || 'Failed to stream response.',
      });
      endSse(res);
    }
  }
}

async function quota(req, res) {
  const used = await quotaService.getTodayChatUsage(req.auth.userId);
  const remaining = quotaService.getRemainingChatRequests(used);

  return ok(res, {
    quota: {
      used,
      remaining,
      limit: env.maxChatRequestsPerDay,
    },
  });
}

module.exports = {
  listChats,
  createChat,
  getChat,
  updateChat,
  deleteChat,
  listMessages,
  listDocuments,
  uploadDocument,
  removeDocument,
  streamMessage,
  quota,
};
