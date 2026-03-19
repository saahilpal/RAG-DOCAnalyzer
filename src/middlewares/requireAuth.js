const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError, unauthorized } = require('../utils/errors');

function extractToken(req) {
  const cookieToken = req.cookies?.[env.authCookieName];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
    }

    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (error) {
    if (error?.code === 'AUTH_REQUIRED') {
      return next(error);
    }

    if (error?.name === 'TokenExpiredError') {
      return next(new AppError(401, 'AUTH_EXPIRED', 'Your session expired. Request a new code to continue.'));
    }

    if (error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError') {
      return next(new AppError(401, 'AUTH_INVALID_TOKEN', 'Your session is no longer valid. Please sign in again.'));
    }

    return next(unauthorized('Invalid or expired authentication token.'));
  }
}

module.exports = {
  requireAuth,
};
