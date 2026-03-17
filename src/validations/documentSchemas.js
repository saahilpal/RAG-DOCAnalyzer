const { z } = require('zod');
const env = require('../config/env');

const documentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const listDocumentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const uploadFileSchema = z.object({
  originalname: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().positive().max(env.maxUploadFileSizeBytes),
  buffer: z.instanceof(Buffer),
});

module.exports = {
  documentIdParamsSchema,
  listDocumentsQuerySchema,
  uploadFileSchema,
};
