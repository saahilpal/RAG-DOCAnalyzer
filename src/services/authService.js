const jwt = require('jsonwebtoken');

const db = require('../database/client');
const env = require('../config/env');
const { AppError, notFound } = require('../utils/errors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || null,
    avatar_url: row.avatar_url || null,
    created_at: row.created_at,
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
  const result = await db.query(
    `SELECT id, email, name, avatar_url, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  if (result.rowCount === 0) {
    throw notFound('User not found.');
  }

  return mapUser(result.rows[0]);
}

async function getUserByEmail(email, client = db) {
  const normalizedEmail = normalizeEmail(email);
  const result = await client.query(
    `SELECT id, email, name, google_id, avatar_url, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] || null;
}

async function upsertGoogleUser({ email, name, picture, googleId }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new AppError(400, 'AUTH_EMAIL_REQUIRED', 'Google account did not provide a usable email address.');
  }

  return db.withTransaction(async (client) => {
    const existing = await getUserByEmail(normalizedEmail, client);

    if (existing) {
      const updateResult = await client.query(
        `UPDATE users
         SET name = $2,
             google_id = $3,
             avatar_url = $4,
             email_verified_at = COALESCE(email_verified_at, NOW()),
             password_hash = COALESCE(password_hash, '__firebase_google_auth__')
         WHERE id = $1
         RETURNING id, email, name, avatar_url, created_at`,
        [
          existing.id,
          name || existing.name || null,
          googleId || existing.google_id || null,
          picture || existing.avatar_url || null,
        ],
      );

      return mapUser(updateResult.rows[0]);
    }

    const insertResult = await client.query(
      `INSERT INTO users (email, name, google_id, avatar_url, password_hash, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, name, avatar_url, created_at`,
      [normalizedEmail, name || null, googleId || null, picture || null, '__firebase_google_auth__'],
    );

    return mapUser(insertResult.rows[0]);
  });
}

module.exports = {
  signAuthToken,
  getUserById,
  getUserByEmail,
  upsertGoogleUser,
};
