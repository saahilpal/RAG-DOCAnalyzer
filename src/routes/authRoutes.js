const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { validateBody } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/requireAuth');
const { authIpLimiter } = require('../middlewares/limiters');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/authSchemas');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/register', authIpLimiter, validateBody(registerSchema), asyncHandler(controller.register));
router.post('/login', authIpLimiter, validateBody(loginSchema), asyncHandler(controller.login));
router.post('/forgot-password', authIpLimiter, validateBody(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
router.post('/reset-password', authIpLimiter, validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword));
router.post('/logout', requireAuth, asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
