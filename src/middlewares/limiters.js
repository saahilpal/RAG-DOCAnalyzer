const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function buildLimiter(max, code, message) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: {
        code,
        message,
      },
    },
  });
}

function getIpRateLimitKey(req) {
  return typeof rateLimit.ipKeyGenerator === 'function' ? rateLimit.ipKeyGenerator(req.ip || '') : req.ip;
}

const uploadIpLimiter = buildLimiter(
  env.uploadRateLimitMax,
  'UPLOAD_RATE_LIMITED',
  'Upload rate limit reached for this connection.',
);

const chatIpLimiter = buildLimiter(
  env.chatRateLimitMax,
  'CHAT_RATE_LIMITED',
  'Chat rate limit reached for this connection.',
);

const otpRequestLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.otpRequestIpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpRateLimitKey,
  message: {
    ok: false,
    error: {
      code: 'OTP_REQUEST_RATE_LIMITED',
      message: 'Too many code requests from this connection. Please try again later.',
    },
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.otpVerifyIpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getIpRateLimitKey,
  message: {
    ok: false,
    error: {
      code: 'OTP_VERIFY_RATE_LIMITED',
      message: 'Too many verification attempts from this connection. Please try again later.',
    },
  },
});

module.exports = {
  uploadIpLimiter,
  chatIpLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
};
