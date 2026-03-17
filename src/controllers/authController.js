const env = require('../config/env');
const { ok } = require('../utils/apiResponse');
const {
  registerUser,
  loginUser,
  signAuthToken,
  getUserById,
  getUserByEmail,
  createOtp,
  resetPassword,
} = require('../services/authService');
const { sendOtpEmail } = require('../services/mailService');
const { ensureSampleDocumentForUserLazy } = require('../services/demoService');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
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

async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await getUserByEmail(email);

  if (user) {
    const otp = await createOtp(user.id, 'password_reset');
    await sendOtpEmail(user.email, otp);
  }

  return ok(res, { message: 'If an account exists, a reset code was sent.' });
}

async function resetPasswordHandler(req, res) {
  await resetPassword(req.body);
  return ok(res, { message: 'Password has been reset successfully.' });
}

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword: resetPasswordHandler,
};
