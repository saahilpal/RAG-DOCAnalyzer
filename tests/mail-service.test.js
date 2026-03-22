const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'test_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';
process.env.EMAIL_FROM = 'DocAnalyzer <test@example.com>';

const logger = require('../src/config/logger');
const mailService = require('../src/services/mailService');

test('sendMailWithRetry retries retryable provider failures and reuses the same idempotency key', async (t) => {
  let attempts = 0;
  const client = {
    emails: {
      async send(_payload, options) {
        attempts += 1;
        assert.equal(options.idempotencyKey, 'otp-send-1');

        if (attempts === 1) {
          return {
            data: null,
            error: {
              name: 'internal_server_error',
              statusCode: 500,
              message: 'Temporary upstream failure',
            },
          };
        }

        return {
          data: { id: 'email_123' },
          error: null,
        };
      },
    },
  };

  const warnMock = t.mock.method(logger, 'warn', () => {});
  const infoMock = t.mock.method(logger, 'info', () => {});

  const result = await mailService.sendMailWithRetry(
    {
      to: 'user@example.com',
      subject: 'Your verification code',
      text: 'Code',
      html: '<p>Code</p>',
    },
    {
      client,
      retryAttempts: 2,
      retryBackoffMs: 0,
      idempotencyKey: 'otp-send-1',
    },
  );

  assert.equal(result.messageId, 'email_123');
  assert.equal(attempts, 2);
  assert.equal(warnMock.mock.callCount(), 1);
  assert.equal(infoMock.mock.callCount(), 1);
});

test('sendMailWithRetry stops retrying on non-retryable resend errors', async () => {
  let attempts = 0;
  const client = {
    emails: {
      async send() {
        attempts += 1;
        return {
          data: null,
          error: {
            name: 'invalid_api_key',
            statusCode: 401,
            message: 'Invalid API key',
          },
        };
      },
    },
  };

  await assert.rejects(
    () =>
      mailService.sendMailWithRetry(
        {
          to: 'user@example.com',
          subject: 'Your verification code',
          text: 'Code',
          html: '<p>Code</p>',
        },
        {
          client,
          retryAttempts: 3,
          retryBackoffMs: 0,
          idempotencyKey: 'otp-send-2',
        },
      ),
    (error) => {
      assert.equal(error.code, 'EMAIL_DELIVERY_FAILED');
      return true;
    },
  );

  assert.equal(attempts, 1);
});

test('buildEmailPayload always uses configured smtp defaults', () => {
  const payload = mailService.buildEmailPayload({
    to: 'user@example.com',
    subject: 'Your verification code',
    html: '<p>Code</p>',
  });

  assert.equal(payload.from, 'DocAnalyzer <test@example.com>');
  assert.equal(payload.to, 'user@example.com');
  assert.equal(payload.subject, 'Your verification code');
});
