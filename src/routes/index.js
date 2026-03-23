const express = require('express');
const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middlewares/requireAuth');
const systemController = require('../controllers/systemController');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.get('/health', systemController.live);
router.get('/health/live', systemController.live);
router.get('/health/ready', asyncHandler(systemController.ready));
router.get('/limits', systemController.limits);
router.get('/quota', requireAuth, asyncHandler(chatController.quota));

router.use('/auth', authRoutes);
router.use('/chats', chatRoutes);

module.exports = router;
