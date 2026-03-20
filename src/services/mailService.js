const { randomUUID } = require('node:crypto');
const { Resend } = require('resend');

const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

const RETRYABLE_PROVIDER_CODES = new Set(['application_error', 'internal_server_error', 'rate_limit_exceeded']);
const resend = new Resend(process.env.RESEND_API_KEY);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function buildEmailPayload({ to, subject, text, html }) {
  return {
    from: process.env.RESEND_FROM || 'DocAnalyzer <onboarding@resend.dev>',
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  };
}

async function sendMailWithRetry(message, options = {}) {
  const resendClient = options.client || resend;
  const retryAttempts = options.retryAttempts ?? env.mail.retryAttempts;
  const retryBackoffMs = options.retryBackoffMs ?? env.mail.retryBackoffMs;
  const idempotencyKey = options.idempotencyKey || randomUUID();
  let lastError = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const { data, error } = await resendClient.emails.send(
        buildEmailPayload(message),
        { idempotencyKey },
      );

      if (error) {
        throw normalizeProviderError(error);
      }

      logger.info('Email sent', {
        provider: 'resend',
        to: message.to,
        subject: message.subject,
        messageId: data?.id || null,
        attempt,
        idempotencyKey,
      });

      return {
        messageId: data?.id || null,
        providerResponse: data || null,
      };
    } catch (error) {
      const normalizedError = normalizeProviderError(error);
      lastError = normalizedError;

      logger.warn('Email send attempt failed', {
        provider: 'resend',
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

      if (!normalizedError.retryable || attempt >= retryAttempts) {
        break;
      }

      await sleep(retryBackoffMs * attempt);
    }
  }

  logger.error('Email delivery failed after retries', {
    provider: 'resend',
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
  buildEmailPayload,
  resend,
  sendMail,
  sendMailWithRetry,
  sendVerificationCodeEmail,
};
