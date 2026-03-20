const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'test_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM = '"DocAnalyzer" <noreply@example.com>';

const logger = require('../src/config/logger');
const mailService = require('../src/services/mailService');
const { AppError } = require('../src/utils/errors');

test('sendMailWithRetry retries retryable provider failures and reuses the same idempotency key', async (t) => {
  let attempts = 0;
  const provider = {
    name: 'resend',
    async send(_message, options) {
      attempts += 1;
      assert.equal(options.idempotencyKey, 'otp-send-1');

      if (attempts === 1) {
        const error = new Error('Temporary upstream failure');
        error.name = 'internal_server_error';
        error.statusCode = 500;
        throw error;
      }

      return { messageId: 'email_123' };
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
      provider,
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

test('sendMailWithRetry stops immediately when delivery is unavailable', async (t) => {
  let attempts = 0;
  const provider = {
    name: 'resend',
    async send() {
      attempts += 1;
      throw new AppError(
        503,
        'EMAIL_DELIVERY_UNAVAILABLE',
        'Email delivery is not configured right now. Please try again later.',
      );
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
          provider,
          retryAttempts: 3,
          retryBackoffMs: 0,
          idempotencyKey: 'otp-send-2',
        },
      ),
    (error) => {
      assert.equal(error.code, 'EMAIL_DELIVERY_UNAVAILABLE');
      return true;
    },
  );

  assert.equal(attempts, 1);
});

test('createResendMailProvider uses the Resend HTTP client and maps API response errors', async () => {
  const client = {
    emails: {
      async send() {
        return {
          data: null,
          error: {
            name: 'rate_limit_exceeded',
            statusCode: 429,
            message: 'Too many requests',
          },
        };
      },
    },
  };

  const provider = mailService.createResendMailProvider(client, '"DocAnalyzer" <noreply@example.com>');

  await assert.rejects(
    () =>
      provider.send(
        {
          to: 'user@example.com',
          subject: 'Your verification code',
          text: 'Code',
          html: '<p>Code</p>',
        },
        { idempotencyKey: 'otp-send-3' },
      ),
    (error) => {
      assert.equal(error.providerCode, 'rate_limit_exceeded');
      assert.equal(error.providerStatusCode, 429);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});
