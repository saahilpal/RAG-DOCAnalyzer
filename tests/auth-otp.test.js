const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'test_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM = 'DocAnalyzer <onboarding@resend.dev>';

const app = require('../src/app');
const env = require('../src/config/env');
const authService = require('../src/services/authService');
const mailService = require('../src/services/mailService');
const db = require('../src/database/client');

test('signup endpoint returns a generic verification payload and never exposes OTP', async (t) => {
  t.mock.method(authService, 'signUpWithPassword', async () => ({
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      created_at: new Date().toISOString(),
      email_verified_at: null,
    },
    verification: {
      id: 'otp-1',
      email: 'user@example.com',
      otp: '123456',
      expiresAt: new Date(Date.now() + env.otpExpirySeconds * 1000).toISOString(),
      resendCooldownSeconds: env.otpResendCooldownSeconds,
    },
  }));
  const mailMock = t.mock.method(mailService, 'sendVerificationCodeEmail', async () => null);

  const response = await request(app).post('/api/v1/auth/signup').send({
    email: 'user@example.com',
    password: 'SecurePass123',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.ok, true);
  assert.match(response.body.data.message, /verification code/i);
  assert.equal(response.body.data.otp, undefined);
  assert.equal(response.body.data.expiresInSeconds, env.otpExpirySeconds);
  assert.equal(response.body.data.resendCooldownSeconds, env.otpResendCooldownSeconds);
  assert.equal(mailMock.mock.callCount(), 1);
});

test('verify-signup endpoint returns token, user, and auth cookie', async (t) => {
  t.mock.method(authService, 'verifySignupOtp', async () => ({
    token: 'signed-token',
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      created_at: new Date().toISOString(),
      email_verified_at: new Date().toISOString(),
    },
  }));

  const response = await request(app)
    .post('/api/v1/auth/verify-signup')
    .send({ email: 'user@example.com', otp: '123456' });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.token, 'signed-token');
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.match(String(response.headers['set-cookie'] || ''), new RegExp(env.authCookieName));
});

test('login endpoint returns user and auth cookie', async (t) => {
  t.mock.method(authService, 'loginWithPassword', async () => ({
    token: 'signed-token',
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      created_at: new Date().toISOString(),
      email_verified_at: new Date().toISOString(),
    },
  }));

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'SecurePass123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.match(String(response.headers['set-cookie'] || ''), new RegExp(env.authCookieName));
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
    created_at: new Date().toISOString(),
    email_verified_at: new Date().toISOString(),
  }));

  const response = await request(app).get('/api/v1/auth/me').set('Cookie', `${env.authCookieName}=${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
});

test('request-password-reset endpoint sends reset email when account is eligible', async (t) => {
  t.mock.method(authService, 'requestPasswordReset', async () => ({
    id: 'otp-reset-1',
    email: 'user@example.com',
    otp: '654321',
    expiresAt: new Date(Date.now() + env.otpExpirySeconds * 1000).toISOString(),
  }));
  const resetMailMock = t.mock.method(mailService, 'sendPasswordResetCodeEmail', async () => null);

  const response = await request(app).post('/api/v1/auth/request-password-reset').send({
    email: 'user@example.com',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.body.data.message, /password reset code/i);
  assert.equal(resetMailMock.mock.callCount(), 1);
});

test('signUpWithPassword hashes password and creates verification OTP with purpose', async (t) => {
  const queries = [];
  let txCount = 0;

  t.mock.method(db, 'withTransaction', async (callback) => {
    txCount += 1;

    if (txCount === 1) {
      const client = {
        query: async (sql, params = []) => {
          queries.push({ sql, params });

          if (sql.includes('FROM users')) {
            return { rowCount: 0, rows: [] };
          }

          if (sql.includes('INSERT INTO users')) {
            return {
              rowCount: 1,
              rows: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                  email: params[0],
                  created_at: new Date().toISOString(),
                  email_verified_at: null,
                },
              ],
            };
          }

          return { rowCount: 0, rows: [] };
        },
      };

      return callback(client);
    }

    const client = {
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql.includes('SELECT COUNT(*)::int AS request_count')) {
          return { rowCount: 1, rows: [{ request_count: 0 }] };
        }

        if (sql.includes('SELECT id, created_at')) {
          return { rowCount: 0, rows: [] };
        }

        if (sql.includes('INSERT INTO otp_codes')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'otp-1',
                email: params[0],
                purpose: params[1],
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + env.otpExpirySeconds * 1000).toISOString(),
              },
            ],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  const result = await authService.signUpWithPassword({
    email: 'User@Example.com',
    password: 'SecurePass123',
  });

  const insertUserQuery = queries.find((entry) => entry.sql.includes('INSERT INTO users'));
  const insertOtpQuery = queries.find((entry) => entry.sql.includes('INSERT INTO otp_codes'));

  assert.ok(insertUserQuery);
  assert.ok(insertOtpQuery);
  assert.equal(insertUserQuery.params[0], 'user@example.com');
  assert.notEqual(insertUserQuery.params[1], 'SecurePass123');
  assert.equal(await bcrypt.compare('SecurePass123', insertUserQuery.params[1]), true);
  assert.equal(insertOtpQuery.params[1], authService.OTP_PURPOSE.VERIFY_EMAIL);
  assert.equal(result.user.email, 'user@example.com');
  assert.match(result.verification.otp, /^\d{6}$/);
});
