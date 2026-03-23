const express = require('express');
const multer = require('multer');

const env = require('../config/env');
const { requireAuth } = require('../middlewares/requireAuth');
const { chatIpLimiter, uploadIpLimiter } = require('../middlewares/limiters');
const { asyncHandler } = require('../utils/asyncHandler');
const { validateBody, validateFile, validateParams, validateQuery } = require('../middlewares/validate');
const {
  chatIdParamsSchema,
  chatDocumentParamsSchema,
  createChatSchema,
  updateChatSchema,
  listChatsQuerySchema,
  listMessagesQuerySchema,
  streamMessageSchema,
} = require('../validations/chatSchemas');
const { uploadFileSchema } = require('../validations/documentSchemas');
const controller = require('../controllers/chatController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadFileSizeBytes,
  },
});

router.get('/', requireAuth, validateQuery(listChatsQuerySchema), asyncHandler(controller.listChats));
router.post('/', requireAuth, validateBody(createChatSchema), asyncHandler(controller.createChat));
router.get('/:chatId', requireAuth, validateParams(chatIdParamsSchema), asyncHandler(controller.getChat));
router.patch(
  '/:chatId',
  requireAuth,
  validateParams(chatIdParamsSchema),
  validateBody(updateChatSchema),
  asyncHandler(controller.updateChat),
);
router.delete(
  '/:chatId',
  requireAuth,
  validateParams(chatIdParamsSchema),
  asyncHandler(controller.deleteChat),
);
router.get(
  '/:chatId/messages',
  requireAuth,
  validateParams(chatIdParamsSchema),
  validateQuery(listMessagesQuerySchema),
  asyncHandler(controller.listMessages),
);
router.post(
  '/:chatId/messages/stream',
  chatIpLimiter,
  requireAuth,
  validateParams(chatIdParamsSchema),
  validateBody(streamMessageSchema),
  controller.streamMessage,
);
router.get(
  '/:chatId/documents',
  requireAuth,
  validateParams(chatIdParamsSchema),
  asyncHandler(controller.listDocuments),
);
router.post(
  '/:chatId/documents',
  uploadIpLimiter,
  requireAuth,
  validateParams(chatIdParamsSchema),
  upload.single('file'),
  validateFile(uploadFileSchema),
  asyncHandler(controller.uploadDocument),
);
router.delete(
  '/:chatId/documents/:documentId',
  requireAuth,
  validateParams(chatDocumentParamsSchema),
  asyncHandler(controller.removeDocument),
);

module.exports = router;
