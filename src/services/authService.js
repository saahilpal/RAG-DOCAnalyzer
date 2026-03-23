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

function normalizeProvider(provider) {
  const rawProvider = String(provider || '').trim().toLowerCase();

  if (!rawProvider) {
    return 'unknown';
  }

  if (rawProvider === 'google.com' || rawProvider === 'google') {
    return 'google';
  }

  if (rawProvider === 'github.com' || rawProvider === 'github') {
    return 'github';
  }

  return rawProvider;
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
    `SELECT id, email, name, provider, provider_id, avatar_url, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] || null;
}

async function upsertSocialUser({ email, name, picture, provider, providerId }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedProvider = normalizeProvider(provider);
  const normalizedProviderId = String(providerId || '').trim() || null;

  if (!normalizedEmail) {
    throw new AppError(400, 'AUTH_EMAIL_REQUIRED', 'Social account did not provide a usable email address.');
  }

  return db.withTransaction(async (client) => {
    const existing = await getUserByEmail(normalizedEmail, client);

    if (existing) {
      const updateResult = await client.query(
        `UPDATE users
         SET name = $2,
             provider = $3,
             provider_id = $4,
             avatar_url = $5
         WHERE id = $1
         RETURNING id, email, name, avatar_url, created_at`,
        [
          existing.id,
          name || existing.name || null,
          normalizedProvider || existing.provider || null,
          normalizedProviderId || existing.provider_id || null,
          picture || existing.avatar_url || null,
        ],
      );

      return mapUser(updateResult.rows[0]);
    }

    const insertResult = await client.query(
      `INSERT INTO users (email, name, provider, provider_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, avatar_url, created_at`,
      [normalizedEmail, name || null, normalizedProvider, normalizedProviderId, picture || null],
    );

    return mapUser(insertResult.rows[0]);
  });
}

module.exports = {
  signAuthToken,
  getUserById,
  getUserByEmail,
  upsertSocialUser,
};
