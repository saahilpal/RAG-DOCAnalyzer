const { z } = require('zod');

const streamChatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  documentId: z.string().uuid(),
  query: z.string().min(1).max(4000),
});

const listSessionsQuerySchema = z.object({
  documentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

module.exports = {
  streamChatSchema,
  listSessionsQuerySchema,
  sessionIdParamsSchema,
};
