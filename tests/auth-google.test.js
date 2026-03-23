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
  t.mock.method(firebase, 'getAuth', () => ({
    verifyIdToken: implementation,
  }));
}

test('google auth endpoint verifies token, sets cookie, and returns user payload', async (t) => {
  let upsertPayload = null;

  mockFirebaseVerifyIdToken(t, async () => ({
    uid: 'google-user-1',
    email: 'user@example.com',
    name: 'User Example',
    picture: 'https://example.com/avatar.png',
    firebase: {
      sign_in_provider: 'google.com',
    },
  }));
  t.mock.method(authService, 'upsertSocialUser', async (payload) => {
    upsertPayload = payload;
    return {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      name: 'User Example',
      avatar_url: 'https://example.com/avatar.png',
      created_at: new Date().toISOString(),
    };
  });

  const response = await request(app).post('/api/v1/auth/google').send({
    idToken: 'firebase-id-token',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.equal(response.body.data.user.name, 'User Example');
  assert.ok(response.body.data.token);
  assert.match(String(response.headers['set-cookie'] || ''), new RegExp(env.authCookieName));
  assert.equal(upsertPayload?.provider, 'google.com');
  assert.equal(upsertPayload?.providerId, 'google-user-1');
});

test('social auth endpoint accepts GitHub Firebase tokens through the same route', async (t) => {
  let upsertPayload = null;

  mockFirebaseVerifyIdToken(t, async () => ({
    uid: 'github-user-1',
    email: 'octo@example.com',
    name: 'Octo User',
    picture: 'https://example.com/octo.png',
    firebase: {
      sign_in_provider: 'github.com',
    },
  }));
  t.mock.method(authService, 'upsertSocialUser', async (payload) => {
    upsertPayload = payload;
    return {
      id: '99999999-9999-4999-8999-999999999999',
      email: 'octo@example.com',
      name: 'Octo User',
      avatar_url: 'https://example.com/octo.png',
      created_at: new Date().toISOString(),
    };
  });

  const response = await request(app).post('/api/v1/auth/google').send({
    idToken: 'firebase-github-id-token',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'octo@example.com');
  assert.equal(upsertPayload?.provider, 'github.com');
  assert.equal(upsertPayload?.providerId, 'github-user-1');
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

test('upsertSocialUser inserts a user when the email is new', async (t) => {
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
                avatar_url: params[4],
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

  const user = await authService.upsertSocialUser({
    email: 'User@Example.com',
    name: 'User Example',
    picture: 'https://example.com/avatar.png',
    provider: 'google.com',
    providerId: 'google-user-1',
  });

  const insertQuery = queries.find((entry) => entry.sql.includes('INSERT INTO users'));

  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 'user@example.com');
  assert.equal(insertQuery.params[1], 'User Example');
  assert.equal(insertQuery.params[2], 'google');
  assert.equal(insertQuery.params[3], 'google-user-1');
  assert.equal(insertQuery.params[4], 'https://example.com/avatar.png');
  assert.equal(user.email, 'user@example.com');
  assert.equal(user.name, 'User Example');
});

test('upsertSocialUser updates an existing row matched by email', async (t) => {
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
                provider: null,
                provider_id: null,
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
                avatar_url: params[4],
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

  const user = await authService.upsertSocialUser({
    email: 'user@example.com',
    name: 'Updated Name',
    picture: 'https://example.com/new-avatar.png',
    provider: 'github.com',
    providerId: 'github-user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[1], 'Updated Name');
  assert.equal(updateQuery.params[2], 'github');
  assert.equal(updateQuery.params[3], 'github-user-1');
  assert.equal(updateQuery.params[4], 'https://example.com/new-avatar.png');
  assert.equal(user.name, 'Updated Name');
  assert.equal(user.avatar_url, 'https://example.com/new-avatar.png');
});
