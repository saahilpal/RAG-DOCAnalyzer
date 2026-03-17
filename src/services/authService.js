const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/client');
const env = require('../config/env');
const { conflict, unauthorized, notFound } = require('../utils/errors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function registerUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const existing = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    throw conflict('Email is already registered.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await db.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [normalizedEmail, passwordHash],
  );

  return result.rows[0];
}

async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const result = await db.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
    [normalizedEmail],
  );

  if (result.rowCount === 0) {
    throw unauthorized('Invalid email or password.');
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw unauthorized('Invalid email or password.');
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  };
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
  const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1 LIMIT 1', [userId]);
  if (result.rowCount === 0) {
    throw notFound('User not found.');
  }
  return result.rows[0];
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const result = await db.query('SELECT id, email, created_at FROM users WHERE email = $1 LIMIT 1', [
    normalizedEmail,
  ]);
  return result.rows[0] || null;
}

async function createOtp(userId, type = 'password_reset') {
  const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.query('DELETE FROM otp_codes WHERE user_id = $1 AND type = $2', [userId, type]);

  await db.query(
    'INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, otp, type, expiresAt],
  );

  return otp;
}

async function verifyOtp(userId, code, type = 'password_reset') {
  const result = await db.query(
    'SELECT id FROM otp_codes WHERE user_id = $1 AND code = $2 AND type = $3 AND expires_at > NOW()',
    [userId, code, type],
  );

  if (result.rowCount === 0) {
    throw unauthorized('Invalid or expired OTP.');
  }

  return true;
}

async function resetPassword({ email, otp, newPassword }) {
  const user = await getUserByEmail(email);
  if (!user) {
    throw unauthorized('Invalid or expired OTP.'); // Same message for security
  }

  await verifyOtp(user.id, otp, 'password_reset');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.withTransaction(async (client) => {
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
    await client.query('DELETE FROM otp_codes WHERE user_id = $1 AND type = $2', [
      user.id,
      'password_reset',
    ]);
  });

  return { id: user.id, email: user.email };
}

module.exports = {
  registerUser,
  loginUser,
  signAuthToken,
  getUserById,
  getUserByEmail,
  createOtp,
  verifyOtp,
  resetPassword,
};
