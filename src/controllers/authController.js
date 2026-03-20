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

async function sendVerificationAndHandleFailures(issuance) {
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

async function sendResetCodeAndHandleFailures(issuance) {
  try {
    await mailService.sendPasswordResetCodeEmail({
      email: issuance.email,
      otp: issuance.otp,
    });
  } catch (error) {
    await authService.invalidateOtpCodeById(issuance.id);
    throw error;
  }
}

async function signup(req, res) {
  const result = await authService.signUpWithPassword(req.body);
  await sendVerificationAndHandleFailures(result.verification);

  return ok(
    res,
    buildOtpResponse('Verification code sent. Enter the code to activate your account.'),
    201,
  );
}

async function resendVerification(req, res) {
  const issuance = await authService.resendVerificationForEmail({ email: req.body.email });
  await sendVerificationAndHandleFailures(issuance);

  return ok(
    res,
    buildOtpResponse('A fresh verification code has been sent to your inbox.'),
  );
}

async function verifySignup(req, res) {
  const result = await authService.verifySignupOtp(req.body);
  res.cookie(env.authCookieName, result.token, getAuthCookieOptions());

  return ok(res, {
    token: result.token,
    user: result.user,
  });
}

async function login(req, res) {
  const result = await authService.loginWithPassword(req.body);
  res.cookie(env.authCookieName, result.token, getAuthCookieOptions());

  return ok(res, {
    token: result.token,
    user: result.user,
  });
}

async function requestPasswordReset(req, res) {
  const issuance = await authService.requestPasswordReset({ email: req.body.email });

  if (issuance) {
    await sendResetCodeAndHandleFailures(issuance);
  }

  return ok(
    res,
    buildOtpResponse('If an account exists for this email, a password reset code has been sent.'),
  );
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  return ok(res, result);
}

async function changePassword(req, res) {
  const result = await authService.changePassword({
    userId: req.auth.userId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });

  return ok(res, result);
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
  signup,
  resendVerification,
  verifySignup,
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
  logout,
  me,
};
