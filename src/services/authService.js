const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../database/client');
const env = require('../config/env');
const logger = require('../config/logger');
const { AppError, notFound } = require('../utils/errors');

const OTP_PURPOSE = {
  VERIFY_EMAIL: 'verify_email',
  PASSWORD_RESET: 'password_reset',
};

let cleanupPromise = null;
let lastCleanupStartedAt = 0;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createOtpValue() {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

function getOtpExpiryDate() {
  return new Date(Date.now() + env.otpExpirySeconds * 1000);
}

function getRetryAfterSeconds(createdAt) {
  const retryAfterMs =
    new Date(createdAt).getTime() + env.otpResendCooldownSeconds * 1000 - Date.now();

  return Math.max(0, Math.ceil(retryAfterMs / 1000));
}

function getHourlyEmailWindowLimitMessage() {
  return 'Too many codes have been sent to this email recently. Please try again in about an hour.';
}

async function cleanupAuthArtifacts() {
  return db.withTransaction(async (client) => {
    const otpDeleteResult = await client.query(
      `DELETE FROM otp_codes
       WHERE expires_at < NOW()
          OR consumed_at IS NOT NULL`,
    );

    const userDeleteResult = await client.query(
      `DELETE FROM users u
       WHERE u.email_verified_at IS NULL
         AND u.created_at < NOW() - ($1 * interval '1 hour')
         AND NOT EXISTS (
           SELECT 1
           FROM otp_codes o
           WHERE o.email = u.email
             AND o.purpose = $2
             AND o.consumed_at IS NULL
             AND o.expires_at > NOW()
         )`,
      [env.staleUnverifiedUserRetentionHours, OTP_PURPOSE.VERIFY_EMAIL],
    );

    return {
      deletedOtpCodes: otpDeleteResult.rowCount || 0,
      deletedUsers: userDeleteResult.rowCount || 0,
    };
  });
}

async function cleanupAuthArtifactsIfDue(options = {}) {
  const force = Boolean(options.force);
  const reason = options.reason || 'periodic';
  const now = Date.now();

  if (!force && now - lastCleanupStartedAt < env.authCleanupIntervalMs) {
    return null;
  }

  if (cleanupPromise) {
    return cleanupPromise;
  }

  lastCleanupStartedAt = now;
  cleanupPromise = cleanupAuthArtifacts()
    .then((result) => {
      logger.info('Auth cleanup completed', {
        reason,
        deletedOtpCodes: result.deletedOtpCodes,
        deletedUsers: result.deletedUsers,
      });
      return result;
    })
    .catch((error) => {
      logger.warn('Auth cleanup failed', {
        reason,
        message: error.message,
      });
      return null;
    })
    .finally(() => {
      cleanupPromise = null;
    });

  return cleanupPromise;
}

function scheduleAuthCleanup(reason) {
  if (env.nodeEnv === 'test') {
    return;
  }

  void cleanupAuthArtifactsIfDue({ reason }).catch(() => {});
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

async function getUserById(userId) {
  const result = await db.query(
    'SELECT id, email, created_at, email_verified_at FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );

  if (result.rowCount === 0) {
    throw notFound('User not found.');
  }

  return result.rows[0];
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const result = await db.query(
    'SELECT id, email, created_at, email_verified_at FROM users WHERE email = $1 LIMIT 1',
    [normalizedEmail],
  );

  return result.rows[0] || null;
}

async function getUserAuthByEmail(email, client = db) {
  const normalizedEmail = normalizeEmail(email);
  const result = await client.query(
    `SELECT id, email, password_hash, created_at, email_verified_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] || null;
}

async function invalidateOtpForEmail(email, purpose = null) {
  const normalizedEmail = normalizeEmail(email);
  if (!purpose) {
    await db.query('DELETE FROM otp_codes WHERE email = $1', [normalizedEmail]);
    return;
  }

  await db.query('DELETE FROM otp_codes WHERE email = $1 AND purpose = $2', [normalizedEmail, purpose]);
}

async function invalidateOtpCodeById(otpCodeId) {
  await db.query('DELETE FROM otp_codes WHERE id = $1', [otpCodeId]);
}

async function issueOtpForEmail({ email, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const otp = createOtpValue();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = getOtpExpiryDate();

  const record = await db.withTransaction(async (client) => {
    await client.query(
      `DELETE FROM otp_codes
       WHERE email = $1
         AND purpose = $2
         AND created_at < NOW() - interval '24 hours'`,
      [normalizedEmail, purpose],
    );

    const hourlyCountResult = await client.query(
      `SELECT COUNT(*)::int AS request_count
       FROM otp_codes
       WHERE email = $1
         AND purpose = $2
         AND created_at > NOW() - interval '1 hour'`,
      [normalizedEmail, purpose],
    );

    if (Number(hourlyCountResult.rows[0]?.request_count || 0) >= env.otpMaxRequestsPerHour) {
      throw new AppError(
        429,
        'OTP_EMAIL_HOURLY_LIMIT',
        getHourlyEmailWindowLimitMessage(),
      );
    }

    const existingResult = await client.query(
      `SELECT id, created_at
       FROM otp_codes
       WHERE email = $1
         AND purpose = $2
         AND consumed_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail, purpose],
    );

    if (existingResult.rowCount > 0) {
      const retryAfterSeconds = getRetryAfterSeconds(existingResult.rows[0].created_at);

      if (retryAfterSeconds > 0) {
        throw new AppError(
          429,
          'OTP_RESEND_COOLDOWN',
          `Please wait ${retryAfterSeconds} seconds before requesting a new code.`,
          { retryAfterSeconds },
        );
      }

      await client.query(
        `UPDATE otp_codes
         SET consumed_at = COALESCE(consumed_at, NOW())
         WHERE id = $1`,
        [existingResult.rows[0].id],
      );
    }

    const insertResult = await client.query(
      `INSERT INTO otp_codes (email, purpose, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, email, purpose, created_at, expires_at`,
      [normalizedEmail, purpose, otpHash, expiresAt],
    );

    return insertResult.rows[0];
  });

  return {
    id: record.id,
    email: normalizedEmail,
    purpose,
    otp,
    expiresAt: record.expires_at,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
  };
}

async function verifyOtpForPurpose({ email, otp, purpose }, client) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  const otpResult = await client.query(
    `SELECT id, email, purpose, otp_hash, expires_at, attempts, created_at, consumed_at
     FROM otp_codes
     WHERE email = $1
       AND purpose = $2
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [normalizedEmail, purpose],
  );

  if (otpResult.rowCount === 0) {
    throw new AppError(401, 'OTP_INVALID', 'The verification code is invalid.');
  }

  const record = otpResult.rows[0];

  if (record.consumed_at) {
    throw new AppError(401, 'OTP_INVALID', 'The verification code is invalid.');
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await client.query(
      `UPDATE otp_codes
       SET consumed_at = COALESCE(consumed_at, NOW())
       WHERE id = $1`,
      [record.id],
    );
    throw new AppError(401, 'OTP_EXPIRED', 'This verification code has expired. Request a new code.');
  }

  if (Number(record.attempts || 0) >= env.otpMaxAttempts) {
    await client.query(
      `UPDATE otp_codes
       SET consumed_at = COALESCE(consumed_at, NOW())
       WHERE id = $1`,
      [record.id],
    );
    throw new AppError(
      429,
      'OTP_TOO_MANY_ATTEMPTS',
      'Too many incorrect attempts. Request a new code.',
    );
  }

  const isValid = await bcrypt.compare(normalizedOtp, record.otp_hash);

  if (!isValid) {
    const nextAttempts = Number(record.attempts || 0) + 1;

    await client.query(
      `UPDATE otp_codes
       SET attempts = $2,
           consumed_at = CASE WHEN $2 >= $3 THEN NOW() ELSE consumed_at END
       WHERE id = $1`,
      [record.id, nextAttempts, env.otpMaxAttempts],
    );

    if (nextAttempts >= env.otpMaxAttempts) {
      throw new AppError(
        429,
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many incorrect attempts. Request a new code.',
      );
    }

    throw new AppError(401, 'OTP_INVALID', 'The verification code is incorrect.');
  }

  await client.query(
    `UPDATE otp_codes
     SET consumed_at = COALESCE(consumed_at, NOW())
     WHERE id = $1`,
    [record.id],
  );
}

async function signUpWithPassword({ email, password }) {
  scheduleAuthCleanup('signup');
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(String(password), 12);

  const user = await db.withTransaction(async (client) => {
    const existing = await getUserAuthByEmail(normalizedEmail, client);

    if (existing?.email_verified_at) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
    }

    if (existing) {
      const updateResult = await client.query(
        `UPDATE users
         SET password_hash = $2
         WHERE id = $1
         RETURNING id, email, created_at, email_verified_at`,
        [existing.id, passwordHash],
      );
      await client.query('DELETE FROM otp_codes WHERE email = $1 AND purpose = $2', [
        normalizedEmail,
        OTP_PURPOSE.VERIFY_EMAIL,
      ]);
      return updateResult.rows[0];
    }

    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at, email_verified_at`,
      [normalizedEmail, passwordHash],
    );

    return insertResult.rows[0];
  });

  const verification = await issueOtpForEmail({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.VERIFY_EMAIL,
  });

  return {
    user,
    verification,
  };
}

async function resendVerificationForEmail({ email }) {
  scheduleAuthCleanup('resend_verification');
  const user = await getUserAuthByEmail(email);
  if (!user) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'No account exists for this email.');
  }

  if (user.email_verified_at) {
    throw new AppError(409, 'EMAIL_ALREADY_VERIFIED', 'This email has already been verified.');
  }

  return issueOtpForEmail({
    email,
    purpose: OTP_PURPOSE.VERIFY_EMAIL,
  });
}

async function verifySignupOtp({ email, otp }) {
  scheduleAuthCleanup('verify_signup');
  const normalizedEmail = normalizeEmail(email);

  const user = await db.withTransaction(async (client) => {
    await verifyOtpForPurpose({ email: normalizedEmail, otp, purpose: OTP_PURPOSE.VERIFY_EMAIL }, client);

    const userResult = await client.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE email = $1
       RETURNING id, email, created_at, email_verified_at`,
      [normalizedEmail],
    );

    if (userResult.rowCount === 0) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'No account exists for this email.');
    }

    return userResult.rows[0];
  });

  return {
    user,
    token: signAuthToken(user),
  };
}

async function loginWithPassword({ email, password }) {
  scheduleAuthCleanup('login');
  const normalizedEmail = normalizeEmail(email);
  const user = await getUserAuthByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  if (!user.password_hash) {
    throw new AppError(
      401,
      'AUTH_INVALID_CREDENTIALS',
      'Email or password is incorrect.',
    );
  }

  const validPassword = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!validPassword) {
    throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  if (!user.email_verified_at) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Please verify your email before signing in.',
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      email_verified_at: user.email_verified_at,
    },
    token: signAuthToken(user),
  };
}

async function requestPasswordReset({ email }) {
  scheduleAuthCleanup('request_password_reset');
  const normalizedEmail = normalizeEmail(email);
  const user = await getUserAuthByEmail(normalizedEmail);

  if (!user || !user.email_verified_at) {
    return null;
  }

  return issueOtpForEmail({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.PASSWORD_RESET,
  });
}

async function resetPassword({ email, otp, newPassword }) {
  scheduleAuthCleanup('reset_password');
  const normalizedEmail = normalizeEmail(email);
  const newPasswordHash = await bcrypt.hash(String(newPassword), 12);

  await db.withTransaction(async (client) => {
    await verifyOtpForPurpose(
      {
        email: normalizedEmail,
        otp,
        purpose: OTP_PURPOSE.PASSWORD_RESET,
      },
      client,
    );

    const userResult = await client.query(
      `UPDATE users
       SET password_hash = $2
       WHERE email = $1
       RETURNING id`,
      [normalizedEmail, newPasswordHash],
    );

    if (userResult.rowCount === 0) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'No account exists for this email.');
    }
  });

  return { passwordReset: true };
}

async function changePassword({ userId, currentPassword, newPassword }) {
  scheduleAuthCleanup('change_password');
  const current = String(currentPassword || '');
  const next = String(newPassword || '');

  const userResult = await db.query(
    `SELECT id, password_hash
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  if (userResult.rowCount === 0) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
  }

  const user = userResult.rows[0];
  if (!user.password_hash) {
    throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Current password is incorrect.');
  }
  const validPassword = await bcrypt.compare(current, user.password_hash);

  if (!validPassword) {
    throw new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'Current password is incorrect.');
  }

  const nextPasswordHash = await bcrypt.hash(next, 12);
  await db.query(
    `UPDATE users
     SET password_hash = $2
     WHERE id = $1`,
    [userId, nextPasswordHash],
  );

  return { passwordUpdated: true };
}

module.exports = {
  OTP_PURPOSE,
  signAuthToken,
  getUserById,
  getUserByEmail,
  signUpWithPassword,
  resendVerificationForEmail,
  verifySignupOtp,
  loginWithPassword,
  requestPasswordReset,
  resetPassword,
  changePassword,
  invalidateOtpForEmail,
  invalidateOtpCodeById,
  cleanupAuthArtifacts,
  cleanupAuthArtifactsIfDue,
};
