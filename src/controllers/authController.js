const env = require('../config/env');
const { ok } = require('../utils/apiResponse');
const { registerUser, loginUser, signAuthToken, getUserById } = require('../services/authService');
const { ensureSampleDocumentForUserLazy } = require('../services/demoService');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProduction,
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

async function register(req, res) {
  const user = await registerUser(req.body);
  await ensureSampleDocumentForUserLazy(user.id);
  const token = signAuthToken(user);

  res.cookie(env.authCookieName, token, getAuthCookieOptions());

  return ok(res, { user }, 201);
}

async function login(req, res) {
  const user = await loginUser(req.body);
  await ensureSampleDocumentForUserLazy(user.id);
  const token = signAuthToken(user);

  res.cookie(env.authCookieName, token, getAuthCookieOptions());

  return ok(res, { user });
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
  const user = await getUserById(req.auth.userId);
  await ensureSampleDocumentForUserLazy(user.id);
  return ok(res, { user });
}

module.exports = {
  register,
  login,
  logout,
  me,
};
