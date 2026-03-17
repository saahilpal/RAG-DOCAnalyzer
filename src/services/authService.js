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

module.exports = {
  registerUser,
  loginUser,
  signAuthToken,
  getUserById,
};
