const { randomUUID } = require('node:crypto');
const { Resend } = require('resend');

const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

const RETRYABLE_PROVIDER_CODES = new Set(['application_error', 'internal_server_error', 'rate_limit_exceeded']);
const UNAVAILABLE_PROVIDER_CODES = new Set([
  'missing_api_key',
  'invalid_api_key',
  'restricted_api_key',
  'invalid_from_address',
]);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createUnavailableMailProvider() {
  return {
    name: 'unconfigured',
    async send() {
      throw new AppError(
        503,
        'EMAIL_DELIVERY_UNAVAILABLE',
        'Email delivery is not configured right now. Please try again later.',
      );
    },
  };
}

function getProviderErrorCode(error) {
  return String(error?.providerCode || error?.code || error?.name || error?.cause?.code || '').toLowerCase();
}

function getProviderStatusCode(error) {
  const statusCode = Number(error?.providerStatusCode ?? error?.statusCode ?? error?.cause?.statusCode);
  return Number.isFinite(statusCode) ? statusCode : null;
}

function isRetryableTransportCode(code) {
  return ['timeout', 'timedout', 'econnreset', 'econnrefused', 'eai_again', 'enotfound', 'fetch'].some((marker) =>
    code.includes(marker),
  );
}

function normalizeProviderError(error) {
  if (error instanceof AppError) {
    error.retryable = false;
    return error;
  }

  const providerCode = getProviderErrorCode(error);
  const providerStatusCode = getProviderStatusCode(error);

  if (UNAVAILABLE_PROVIDER_CODES.has(providerCode)) {
    const unavailableError = new AppError(
      503,
      'EMAIL_DELIVERY_UNAVAILABLE',
      'Email delivery is not configured right now. Please try again later.',
    );
    unavailableError.providerCode = providerCode;
    unavailableError.providerStatusCode = providerStatusCode;
    unavailableError.retryable = false;
    return unavailableError;
  }

  const normalizedError = new Error(error?.message || 'Email delivery failed.');
  normalizedError.code = providerCode || 'email_delivery_error';
  normalizedError.providerCode = providerCode || null;
  normalizedError.providerStatusCode = providerStatusCode;
  normalizedError.retryable =
    providerStatusCode === 429 ||
    providerStatusCode >= 500 ||
    RETRYABLE_PROVIDER_CODES.has(providerCode) ||
    isRetryableTransportCode(providerCode);
  return normalizedError;
}

function createResendMailProvider(client = new Resend(env.resend.apiKey), fromAddress = env.resend.from) {
  const resendClient = client;

  return {
    name: 'resend',
    async send({ to, subject, text, html }, options = {}) {
      const { data, error } = await resendClient.emails.send(
        {
          from: fromAddress,
          to,
          subject,
          text,
          html,
        },
        options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
      );

      if (error) {
        throw normalizeProviderError(error);
      }

      return {
        messageId: data?.id || null,
        providerResponse: data || null,
      };
    },
  };
}

function createMailProvider(config = env.resend, client = null) {
  if (!config.apiKey || !config.from) {
    return createUnavailableMailProvider();
  }

  return createResendMailProvider(client || new Resend(config.apiKey), config.from);
}

async function sendMailWithRetry(message, options = {}) {
  const provider = options.provider || createMailProvider();
  const retryAttempts = options.retryAttempts ?? env.mail.retryAttempts;
  const retryBackoffMs = options.retryBackoffMs ?? env.mail.retryBackoffMs;
  const idempotencyKey = options.idempotencyKey || randomUUID();
  let lastError = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const info = await provider.send(message, { idempotencyKey });

      logger.info('Email sent', {
        provider: provider.name,
        to: message.to,
        subject: message.subject,
        messageId: info?.messageId || null,
        attempt,
        idempotencyKey,
      });

      return info;
    } catch (error) {
      const normalizedError = normalizeProviderError(error);
      lastError = normalizedError;

      logger.warn('Email send attempt failed', {
        provider: provider.name,
        to: message.to,
        subject: message.subject,
        attempt,
        retryAttempts,
        code: getProviderErrorCode(normalizedError),
        statusCode: getProviderStatusCode(normalizedError),
        retryable: Boolean(normalizedError.retryable),
        message: normalizedError.message,
        idempotencyKey,
      });

      if (normalizedError instanceof AppError && normalizedError.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
        logger.error('Email delivery is unavailable', {
          provider: provider.name,
          to: message.to,
          subject: message.subject,
          code: normalizedError.code,
          providerCode: getProviderErrorCode(normalizedError),
          statusCode: getProviderStatusCode(normalizedError),
          message: normalizedError.message,
          idempotencyKey,
        });
        throw normalizedError;
      }

      if (!normalizedError.retryable || attempt >= retryAttempts) {
        break;
      }

      await sleep(retryBackoffMs * attempt);
    }
  }

  logger.error('Email delivery failed after retries', {
    provider: provider.name,
    to: message.to,
    subject: message.subject,
    retryAttempts,
    code: getProviderErrorCode(lastError),
    statusCode: getProviderStatusCode(lastError),
    message: lastError?.message,
    idempotencyKey,
  });

  if (lastError instanceof AppError) {
    throw lastError;
  }

  throw new AppError(
    503,
    'EMAIL_DELIVERY_FAILED',
    'We could not send the verification code right now. Please try again in a moment.',
  );
}

async function sendMail({ to, subject, text, html }) {
  return sendMailWithRetry({ to, subject, text, html });
}

async function sendVerificationCodeEmail({ email, otp }) {
  const subject = 'Your verification code';
  const expiryMinutes = Math.max(1, Math.round(env.otpExpirySeconds / 60));

  return sendMail({
    to: email,
    subject,
    text: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background: #ffffff; color: #171717;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #525252;">Your verification code</p>
        <div style="padding: 16px; border-radius: 12px; background: #f5f5f5; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
          ${otp}
        </div>
        <p style="margin: 16px 0 0; font-size: 14px; color: #525252;">
          This code expires in ${expiryMinutes} minutes. If you did not request it, you can ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = {
  createMailProvider,
  createResendMailProvider,
  sendMail,
  sendMailWithRetry,
  sendVerificationCodeEmail,
};
