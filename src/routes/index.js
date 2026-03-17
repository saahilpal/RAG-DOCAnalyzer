const express = require('express');
const authRoutes = require('./authRoutes');
const documentRoutes = require('./documentRoutes');
const chatRoutes = require('./chatRoutes');
const { asyncHandler } = require('../utils/asyncHandler');
const systemController = require('../controllers/systemController');

const router = express.Router();

router.get('/health', systemController.live);
router.get('/health/live', systemController.live);
router.get('/health/ready', asyncHandler(systemController.ready));
router.get('/limits', systemController.limits);

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
