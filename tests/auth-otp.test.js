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
const { AppError } = require('../src/utils/errors');

test('request-otp endpoint returns a generic success payload and never exposes the OTP', async (t) => {
  t.mock.method(authService, 'requestOtpForEmail', async () => ({
    email: 'user@example.com',
    otp: '123456',
    expiresAt: new Date(Date.now() + env.otpExpirySeconds * 1000).toISOString(),
    resendCooldownSeconds: env.otpResendCooldownSeconds,
  }));
  const mailMock = t.mock.method(mailService, 'sendVerificationCodeEmail', async () => null);

  const response = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ email: 'user@example.com' });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.body.data.message, /verification code/i);
  assert.equal(response.body.data.otp, undefined);
  assert.equal(response.body.data.expiresInSeconds, env.otpExpirySeconds);
  assert.equal(response.body.data.resendCooldownSeconds, env.otpResendCooldownSeconds);
  assert.equal(mailMock.mock.callCount(), 1);
});

test('verify-otp endpoint returns a token, user, and auth cookie', async (t) => {
  t.mock.method(authService, 'verifyOtpForEmail', async () => ({
    token: 'signed-token',
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      created_at: new Date().toISOString(),
      email_verified_at: new Date().toISOString(),
    },
  }));

  const response = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email: 'user@example.com', otp: '123456' });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.token, 'signed-token');
  assert.equal(response.body.data.user.email, 'user@example.com');
  assert.match(String(response.headers['set-cookie'] || ''), new RegExp(env.authCookieName));
});

test('me endpoint restores the authenticated user from the auth cookie', async (t) => {
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

  const response = await request(app)
    .get('/api/v1/auth/me')
    .set('Cookie', `${env.authCookieName}=${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.user.email, 'user@example.com');
});

test('requestOtpForEmail hashes the OTP before storing it', async (t) => {
  const queries = [];

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        queries.push({ sql, params });

        if (sql.includes('SELECT id, created_at')) {
          return { rowCount: 0, rows: [] };
        }

        if (sql.includes('INSERT INTO otp_codes')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'otp-1',
                email: 'user@example.com',
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

  const result = await authService.requestOtpForEmail({ email: 'User@Example.com' });
  const insertQuery = queries.find((entry) => entry.sql.includes('INSERT INTO otp_codes'));

  assert.ok(insertQuery);
  assert.match(result.otp, /^\d{6}$/);
  assert.equal(insertQuery.params[0], 'user@example.com');
  assert.notEqual(insertQuery.params[1], result.otp);
  assert.equal(await bcrypt.compare(result.otp, insertQuery.params[1]), true);
});

test('requestOtpForEmail enforces resend cooldown', async (t) => {
  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql) => {
        if (sql.includes('SELECT id, created_at')) {
          return {
            rowCount: 1,
            rows: [{ id: 'otp-1', created_at: new Date().toISOString() }],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  await assert.rejects(
    () => authService.requestOtpForEmail({ email: 'user@example.com' }),
    (error) => {
      assert.equal(error.code, 'OTP_RESEND_COOLDOWN');
      assert.equal(error.statusCode, 429);
      return true;
    },
  );
});

test('verifyOtpForEmail rejects expired codes and marks them consumed', async (t) => {
  const expiredHash = await bcrypt.hash('123456', 10);
  let consumed = false;

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        if (sql.includes('SELECT id, email, otp_hash')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'otp-1',
                email: 'user@example.com',
                otp_hash: expiredHash,
                expires_at: new Date(Date.now() - 1_000).toISOString(),
                attempts: 0,
                created_at: new Date().toISOString(),
                consumed_at: null,
              },
            ],
          };
        }

        if (sql.includes('UPDATE otp_codes') && params[0] === 'otp-1') {
          consumed = true;
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  await assert.rejects(
    () => authService.verifyOtpForEmail({ email: 'user@example.com', otp: '123456' }),
    (error) => {
      assert.equal(error.code, 'OTP_EXPIRED');
      return true;
    },
  );

  assert.equal(consumed, true);
});

test('verifyOtpForEmail locks the code after the maximum number of incorrect attempts', async (t) => {
  const storedHash = await bcrypt.hash('654321', 10);
  let updateParams = null;

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        if (sql.includes('SELECT id, email, otp_hash')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'otp-1',
                email: 'user@example.com',
                otp_hash: storedHash,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
                attempts: env.otpMaxAttempts - 1,
                created_at: new Date().toISOString(),
                consumed_at: null,
              },
            ],
          };
        }

        if (sql.includes('UPDATE otp_codes')) {
          updateParams = params;
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  await assert.rejects(
    () => authService.verifyOtpForEmail({ email: 'user@example.com', otp: '123456' }),
    (error) => {
      assert.equal(error.code, 'OTP_TOO_MANY_ATTEMPTS');
      return true;
    },
  );

  assert.ok(updateParams);
  assert.equal(updateParams[1], env.otpMaxAttempts);
});

test('verifyOtpForEmail creates or verifies the user and returns a signed token', async (t) => {
  const storedHash = await bcrypt.hash('123456', 10);
  let consumed = false;

  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql, params = []) => {
        if (sql.includes('SELECT id, email, otp_hash')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'otp-1',
                email: 'user@example.com',
                otp_hash: storedHash,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
                attempts: 0,
                created_at: new Date().toISOString(),
                consumed_at: null,
              },
            ],
          };
        }

        if (sql.includes('INSERT INTO users')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                email: params[0],
                created_at: new Date().toISOString(),
                email_verified_at: new Date().toISOString(),
              },
            ],
          };
        }

        if (sql.includes('UPDATE otp_codes') && params[0] === 'otp-1') {
          consumed = true;
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  const result = await authService.verifyOtpForEmail({
    email: 'User@Example.com',
    otp: '123456',
  });
  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);

  assert.equal(result.user.email, 'user@example.com');
  assert.equal(decoded.sub, result.user.id);
  assert.equal(decoded.email, result.user.email);
  assert.equal(consumed, true);
});

test('requestOtpForEmail enforces the hourly per-email request limit', async (t) => {
  t.mock.method(db, 'withTransaction', async (callback) => {
    const client = {
      query: async (sql) => {
        if (sql.includes('SELECT COUNT(*)::int AS request_count')) {
          return {
            rowCount: 1,
            rows: [{ request_count: env.otpMaxRequestsPerHour }],
          };
        }

        if (sql.includes('SELECT id, created_at')) {
          return { rowCount: 0, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  await assert.rejects(
    () => authService.requestOtpForEmail({ email: 'user@example.com' }),
    (error) => {
      assert.equal(error.code, 'OTP_EMAIL_HOURLY_LIMIT');
      assert.equal(error.statusCode, 429);
      return true;
    },
  );
});

test('resend-otp endpoint surfaces cooldown errors with retry details', async (t) => {
  t.mock.method(authService, 'resendOtpForEmail', async () => {
    throw new AppError(429, 'OTP_RESEND_COOLDOWN', 'Please wait 42 seconds before requesting a new code.', {
      retryAfterSeconds: 42,
    });
  });

  const response = await request(app)
    .post('/api/v1/auth/resend-otp')
    .send({ email: 'user@example.com' });

  assert.equal(response.status, 429);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error.code, 'OTP_RESEND_COOLDOWN');
  assert.equal(response.body.error.details.retryAfterSeconds, 42);
});
