const { z } = require('zod');
const env = require('../config/env');

const uploadFileSchema = z.object({
  originalname: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().int().positive().max(env.maxUploadFileSizeBytes),
  buffer: z.instanceof(Buffer),
});

module.exports = {
  uploadFileSchema,
};
