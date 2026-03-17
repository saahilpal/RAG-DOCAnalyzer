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

const uploadIpLimiter = buildLimiter(
  env.uploadRateLimitMax,
  'UPLOAD_RATE_LIMITED',
  'Upload rate limit reached for this IP in demo environment.',
);

const chatIpLimiter = buildLimiter(
  env.chatRateLimitMax,
  'CHAT_RATE_LIMITED',
  'Chat rate limit reached for this IP in demo environment.',
);

const authIpLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const ipKey =
      typeof rateLimit.ipKeyGenerator === 'function' ? rateLimit.ipKeyGenerator(req.ip || '') : req.ip;
    return `${ipKey}:${email || 'anonymous'}`;
  },
  message: {
    ok: false,
    error: {
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

module.exports = {
  uploadIpLimiter,
  chatIpLimiter,
  authIpLimiter,
};
