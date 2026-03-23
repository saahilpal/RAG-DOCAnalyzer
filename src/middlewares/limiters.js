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

const authIpLimiter = buildLimiter(
  env.authRateLimitMax,
  'AUTH_RATE_LIMITED',
  'Too many sign-in attempts. Please try again later.',
);

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

module.exports = {
  authIpLimiter,
  uploadIpLimiter,
  chatIpLimiter,
};
