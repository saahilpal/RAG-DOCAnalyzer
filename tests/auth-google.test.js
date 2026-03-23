const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'test_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.FIREBASE_PROJECT_ID = 'demo-project';
process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@example.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n';

const app = require('../src/app');
const env = require('../src/config/env');
const authService = require('../src/services/authService');
const firebase = require('../src/config/firebase');
const db = require('../src/database/client');

function mockFirebaseVerifyIdToken(t, implementation) {
  Object.defineProperty(firebase, 'auth', {
    configurable: true,
    value: () => ({
      verifyIdToken: implementation,
    }),
  });

  t.after(() => {
    delete firebase.auth;
  });
}

test('google auth endpoint verifies token, sets cookie, and returns user payload', async (t) => {
  mockFirebaseVerifyIdToken(t, async () => ({
    uid: 'google-user-1',
    email: 'user@example.com',
    name: 'User Example',
    picture: 'https://example.com/avatar.png',
  }));
  t.mock.method(authService, 'upsertGoogleUser', async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    name: 'User Example',
    avatar_url: 'https://example.com/avatar.png',
    created_at: new Date().toISOString(),
  }));

  const response = await request(app).post('/api/v1/auth/google').send({
    idToken: 'firebase-id-token',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.equal(response.body.data.user.name, 'User Example');
  assert.ok(response.body.data.token);
  assert.match(String(response.headers['set-cookie'] || ''), new RegExp(env.authCookieName));
});

test('google auth endpoint returns 401 when Firebase token verification fails', async (t) => {
  mockFirebaseVerifyIdToken(t, async () => {
    const error = new Error('token invalid');
    error.code = 'auth/id-token-expired';
    throw error;
  });

  const response = await request(app).post('/api/v1/auth/google').send({
    idToken: 'invalid-token',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error.code, 'AUTH_INVALID_GOOGLE_TOKEN');
});

test('me endpoint restores authenticated user from auth cookie', async (t) => {
  const token = jwt.sign(
    {
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  t.mock.method(authService, 'getUserById', async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    name: 'User Example',
    avatar_url: 'https://example.com/avatar.png',
    created_at: new Date().toISOString(),
  }));

  const response = await request(app)
    .get('/api/v1/auth/me')
    .set('Cookie', `${env.authCookieName}=${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.equal(response.body.data.user.name, 'User Example');
});

test('upsertGoogleUser inserts a user when the email is new', async (t) => {
  const queries = [];

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql.includes('WHERE email = $1')) {
          return { rowCount: 0, rows: [] };
        }

        if (sql.includes('INSERT INTO users')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                email: params[0],
                name: params[1],
                avatar_url: params[3],
                created_at: new Date().toISOString(),
              },
            ],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  const user = await authService.upsertGoogleUser({
    email: 'User@Example.com',
    name: 'User Example',
    picture: 'https://example.com/avatar.png',
    googleId: 'google-user-1',
  });

  const insertQuery = queries.find((entry) => entry.sql.includes('INSERT INTO users'));

  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 'user@example.com');
  assert.equal(insertQuery.params[1], 'User Example');
  assert.equal(insertQuery.params[2], 'google-user-1');
  assert.equal(insertQuery.params[3], 'https://example.com/avatar.png');
  assert.equal(insertQuery.params[4], '__firebase_google_auth__');
  assert.equal(user.email, 'user@example.com');
  assert.equal(user.name, 'User Example');
});

test('upsertGoogleUser updates an existing row matched by email', async (t) => {
  const queries = [];

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql.includes('WHERE email = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                email: params[0],
                name: 'Old Name',
                google_id: null,
                avatar_url: null,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }

        if (sql.includes('UPDATE users')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: params[0],
                email: 'user@example.com',
                name: params[1],
                avatar_url: params[3],
                created_at: new Date().toISOString(),
              },
            ],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  const user = await authService.upsertGoogleUser({
    email: 'user@example.com',
    name: 'Updated Name',
    picture: 'https://example.com/new-avatar.png',
    googleId: 'google-user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[1], 'Updated Name');
  assert.equal(updateQuery.params[2], 'google-user-1');
  assert.equal(updateQuery.params[3], 'https://example.com/new-avatar.png');
  assert.equal(user.name, 'Updated Name');
  assert.equal(user.avatar_url, 'https://example.com/new-avatar.png');
});
