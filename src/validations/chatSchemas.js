const { z } = require('zod');
const env = require('../config/env');

const chatIdParamsSchema = z.object({
  chatId: z.string().uuid(),
});

const chatDocumentParamsSchema = z.object({
  chatId: z.string().uuid(),
  documentId: z.string().uuid(),
});

const createChatSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

const listChatsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(env.chatMessageListLimit).optional(),
});

const streamMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  clientMessageId: z.string().trim().min(1).max(128),
});

module.exports = {
  chatIdParamsSchema,
  chatDocumentParamsSchema,
  createChatSchema,
  listChatsQuerySchema,
  listMessagesQuerySchema,
  streamMessageSchema,
};
