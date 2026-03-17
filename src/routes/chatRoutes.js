const express = require('express');
const { requireAuth } = require('../middlewares/requireAuth');
const { chatIpLimiter } = require('../middlewares/limiters');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validate');
const {
  streamChatSchema,
  listSessionsQuerySchema,
  sessionIdParamsSchema,
} = require('../validations/chatSchemas');
const { asyncHandler } = require('../utils/asyncHandler');
const controller = require('../controllers/chatController');

const router = express.Router();

router.post('/stream', chatIpLimiter, requireAuth, validateBody(streamChatSchema), controller.stream);
router.get('/sessions', requireAuth, validateQuery(listSessionsQuerySchema), asyncHandler(controller.sessions));
router.get(
  '/sessions/:sessionId/messages',
  requireAuth,
  validateParams(sessionIdParamsSchema),
  asyncHandler(controller.messages),
);
router.get('/quota', requireAuth, asyncHandler(controller.quota));

module.exports = router;
