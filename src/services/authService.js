const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../database/client');
const env = require('../config/env');
const { AppError, notFound } = require('../utils/errors');

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

async function invalidateOtpForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  await db.query('DELETE FROM otp_codes WHERE email = $1', [normalizedEmail]);
}

async function invalidateOtpCodeById(otpCodeId) {
  await db.query('DELETE FROM otp_codes WHERE id = $1', [otpCodeId]);
}

async function issueOtpForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const otp = createOtpValue();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = getOtpExpiryDate();

  const record = await db.withTransaction(async (client) => {
    await client.query(
      `DELETE FROM otp_codes
       WHERE email = $1
         AND created_at < NOW() - interval '24 hours'`,
      [normalizedEmail],
    );

    const hourlyCountResult = await client.query(
      `SELECT COUNT(*)::int AS request_count
       FROM otp_codes
       WHERE email = $1
         AND created_at > NOW() - interval '1 hour'`,
      [normalizedEmail],
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
         AND consumed_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail],
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
    }

    if (existingResult.rowCount > 0) {
      await client.query(
        `UPDATE otp_codes
         SET consumed_at = COALESCE(consumed_at, NOW())
         WHERE id = $1`,
        [existingResult.rows[0].id],
      );
    }

    const insertResult = await client.query(
      `INSERT INTO otp_codes (email, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       RETURNING id, email, created_at, expires_at`,
      [normalizedEmail, otpHash, expiresAt],
    );

    return insertResult.rows[0];
  });

  return {
    id: record.id,
    email: normalizedEmail,
    otp,
    expiresAt: record.expires_at,
    resendCooldownSeconds: env.otpResendCooldownSeconds,
  };
}

async function requestOtpForEmail({ email }) {
  return issueOtpForEmail(email);
}

async function resendOtpForEmail({ email }) {
  return issueOtpForEmail(email);
}

async function verifyOtpForEmail({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  const user = await db.withTransaction(async (client) => {
    const otpResult = await client.query(
      `SELECT id, email, otp_hash, expires_at, attempts, created_at, consumed_at
       FROM otp_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail],
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
      throw new AppError(401, 'OTP_EXPIRED', 'This verification code has expired. Request a new one.');
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

    const userResult = await client.query(
      `INSERT INTO users (email, email_verified_at)
       VALUES ($1, NOW())
       ON CONFLICT (email)
       DO UPDATE SET email_verified_at = COALESCE(users.email_verified_at, NOW())
       RETURNING id, email, created_at, email_verified_at`,
      [normalizedEmail],
    );

    await client.query(
      `UPDATE otp_codes
       SET consumed_at = COALESCE(consumed_at, NOW())
       WHERE id = $1`,
      [record.id],
    );

    return userResult.rows[0];
  });

  return {
    user,
    token: signAuthToken(user),
  };
}

module.exports = {
  signAuthToken,
  getUserById,
  getUserByEmail,
  requestOtpForEmail,
  resendOtpForEmail,
  verifyOtpForEmail,
  invalidateOtpForEmail,
  invalidateOtpCodeById,
};
