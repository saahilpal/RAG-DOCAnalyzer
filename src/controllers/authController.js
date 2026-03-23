const env = require('../config/env');
const firebase = require('../config/firebase');
const logger = require('../config/logger');
const { ok } = require('../utils/apiResponse');
const { AppError } = require('../utils/errors');
const authService = require('../services/authService');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

async function google(req, res) {
  const idToken = String(req.body.idToken || '').trim();
  const auth = firebase.getAuth();
  let decodedToken;

  if (!auth) {
    logger.error('Firebase auth is not initialized');
    throw new AppError(500, 'FIREBASE_NOT_CONFIGURED', 'Firebase not configured');
  }

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    logger.warn('Firebase token verification failed', {
      message: error?.message,
      code: error?.code,
    });
    throw new AppError(401, 'AUTH_INVALID_GOOGLE_TOKEN', 'Invalid Google token. Please sign in again.');
  }

  const email = String(decodedToken.email || '').trim().toLowerCase();
  const provider = decodedToken?.firebase?.sign_in_provider || 'unknown';

  if (!email) {
    throw new AppError(400, 'AUTH_EMAIL_REQUIRED', 'Social account did not provide a usable email address.');
  }

  const user = await authService.upsertSocialUser({
    email,
    name: decodedToken.name || null,
    picture: decodedToken.picture || null,
    provider,
    providerId: decodedToken.uid || null,
  });
  const token = authService.signAuthToken(user);

  res.cookie(env.authCookieName, token, getAuthCookieOptions());

  return ok(res, {
    token,
    user,
  });
}

async function logout(_req, res) {
  res.clearCookie(env.authCookieName, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
    expires: new Date(0),
  });

  return ok(res, { loggedOut: true });
}

async function me(req, res) {
  const user = await authService.getUserById(req.auth.userId);
  return ok(res, { user });
}

module.exports = {
  google,
  logout,
  me,
};
