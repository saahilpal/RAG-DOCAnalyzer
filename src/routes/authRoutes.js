const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { validateBody } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/requireAuth');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middlewares/limiters');
const {
  signupSchema,
  verifySignupSchema,
  resendVerificationSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validations/authSchemas');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/signup', otpRequestLimiter, validateBody(signupSchema), asyncHandler(controller.signup));
router.post(
  '/resend-verification',
  otpRequestLimiter,
  validateBody(resendVerificationSchema),
  asyncHandler(controller.resendVerification),
);
router.post('/verify-signup', otpVerifyLimiter, validateBody(verifySignupSchema), asyncHandler(controller.verifySignup));
router.post('/login', validateBody(loginSchema), asyncHandler(controller.login));
router.post(
  '/request-password-reset',
  otpRequestLimiter,
  validateBody(requestPasswordResetSchema),
  asyncHandler(controller.requestPasswordReset),
);
router.post('/reset-password', otpVerifyLimiter, validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword));
router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
