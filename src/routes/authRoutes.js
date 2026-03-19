const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { validateBody } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/requireAuth');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middlewares/limiters');
const {
  requestOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
} = require('../validations/authSchemas');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/request-otp', otpRequestLimiter, validateBody(requestOtpSchema), asyncHandler(controller.requestOtp));
router.post('/resend-otp', otpRequestLimiter, validateBody(resendOtpSchema), asyncHandler(controller.resendOtp));
router.post('/verify-otp', otpVerifyLimiter, validateBody(verifyOtpSchema), asyncHandler(controller.verifyOtp));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
