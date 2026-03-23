const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { validateBody } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/requireAuth');
const { authIpLimiter } = require('../middlewares/limiters');
const { googleAuthSchema } = require('../validations/authSchemas');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/google', authIpLimiter, validateBody(googleAuthSchema), asyncHandler(controller.google));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
