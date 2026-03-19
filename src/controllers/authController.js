const env = require('../config/env');
const { ok } = require('../utils/apiResponse');
const authService = require('../services/authService');
const mailService = require('../services/mailService');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: env.isProduction ? 'none' : 'lax',
    secure: env.isProduction,
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

function buildOtpResponse(message) {
  return {
    message,
    expiresInSeconds: env.otpExpirySeconds,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
  };
}

async function sendOtpAndHandleFailures(issuance) {
  try {
    await mailService.sendVerificationCodeEmail({
      email: issuance.email,
      otp: issuance.otp,
    });
  } catch (error) {
    await authService.invalidateOtpCodeById(issuance.id);
    throw error;
  }
}

async function requestOtp(req, res) {
  const issuance = await authService.requestOtpForEmail({ email: req.body.email });
  await sendOtpAndHandleFailures(issuance);

  return ok(
    res,
    buildOtpResponse('If the address can receive codes, a verification code has been sent.'),
  );
}

async function resendOtp(req, res) {
  const issuance = await authService.resendOtpForEmail({ email: req.body.email });
  await sendOtpAndHandleFailures(issuance);

  return ok(
    res,
    buildOtpResponse('If the address can receive codes, a fresh verification code has been sent.'),
  );
}

async function verifyOtp(req, res) {
  const result = await authService.verifyOtpForEmail(req.body);

  res.cookie(env.authCookieName, result.token, getAuthCookieOptions());

  return ok(res, {
    token: result.token,
    user: result.user,
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
  requestOtp,
  resendOtp,
  verifyOtp,
  logout,
  me,
};
