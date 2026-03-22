const dns = require('node:dns');
const { randomUUID } = require('node:crypto');
const nodemailer = require('nodemailer');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;
const RETRYABLE_PROVIDER_CODES = new Set(['econnection', 'esocket', 'etimedout', 'timeout', 'eai_again']);
const transporter = nodemailer.createTransport({
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.secure,
  auth: {
    user: env.mail.user,
    pass: env.mail.pass,
  },
  connectionTimeout: CONNECTION_TIMEOUT_MS,
  greetingTimeout: GREETING_TIMEOUT_MS,
  socketTimeout: SOCKET_TIMEOUT_MS,
});

let transporterVerified = false;
let verifyPromise = null;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getProviderErrorCode(error) {
  return String(
    error?.providerCode ||
      error?.code ||
      error?.responseCode ||
      error?.errno ||
      error?.name ||
      error?.cause?.code ||
      '',
  ).toLowerCase();
}

function getProviderStatusCode(error) {
  const statusCode = Number(
    error?.providerStatusCode ??
      error?.responseCode ??
      error?.statusCode ??
      error?.cause?.responseCode ??
      error?.cause?.statusCode,
  );
  return Number.isFinite(statusCode) ? statusCode : null;
}

function getProviderMessageText(error) {
  return [error?.message, error?.response, error?.cause?.message, error?.cause?.response]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isRetryableTransportCode(code, message) {
  return [
    'timeout',
    'timedout',
    'econnreset',
    'econnrefused',
    'econnection',
    'eai_again',
    'enotfound',
    'esocket',
    'edns',
    'network',
  ].some((marker) => code.includes(marker) || message.includes(marker));
}

function isAuthFailure(code, statusCode, message) {
  return (
    code.includes('auth') ||
    [530, 534, 535].includes(statusCode) ||
    message.includes('invalid login') ||
    message.includes('username and password not accepted') ||
    message.includes('authentication failed')
  );
}

function isRateLimitedFailure(code, statusCode, message) {
  return (
    code.includes('rate') ||
    [421, 450, 451, 452, 454].includes(statusCode) ||
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('quota exceeded') ||
    message.includes('daily user sending quota exceeded')
  );
}

function normalizeProviderError(error) {
  if (error instanceof AppError) {
    error.retryable = false;
    return error;
  }

  const providerCode = getProviderErrorCode(error);
  const providerStatusCode = getProviderStatusCode(error);
  const providerMessage = getProviderMessageText(error);

  const normalizedError = new Error(error?.message || 'Email delivery failed.');
  normalizedError.code = providerCode || 'email_delivery_error';
  normalizedError.providerCode = providerCode || null;
  normalizedError.providerStatusCode = providerStatusCode;
  normalizedError.command = error?.command || null;
  normalizedError.response = error?.response || null;

  if (isAuthFailure(providerCode, providerStatusCode, providerMessage)) {
    normalizedError.code = 'email_auth_failed';
    normalizedError.publicCode = 'EMAIL_AUTH_FAILED';
    normalizedError.publicMessage =
      'We could not send the email because the mail service is temporarily unavailable. Please try again later.';
    normalizedError.retryable = false;
    return normalizedError;
  }

  if (isRateLimitedFailure(providerCode, providerStatusCode, providerMessage)) {
    normalizedError.code = 'email_rate_limited';
    normalizedError.publicCode = 'EMAIL_RATE_LIMITED';
    normalizedError.publicMessage =
      'We could not send the email right now because the mail provider is throttling requests. Please try again in a few minutes.';
    normalizedError.retryable = true;
    return normalizedError;
  }

  if (RETRYABLE_PROVIDER_CODES.has(providerCode) || isRetryableTransportCode(providerCode, providerMessage)) {
    normalizedError.code = 'email_connection_failed';
    normalizedError.publicCode = 'EMAIL_CONNECTION_FAILED';
    normalizedError.publicMessage =
      'We could not reach the mail provider right now. Please try again in a moment.';
    normalizedError.retryable = true;
    return normalizedError;
  }

  normalizedError.publicCode = 'EMAIL_DELIVERY_FAILED';
  normalizedError.publicMessage = 'We could not send the email right now. Please try again in a moment.';
  normalizedError.retryable =
    providerStatusCode === 429 ||
    providerStatusCode >= 500 ||
    providerStatusCode === 421 ||
    (providerStatusCode >= 450 && providerStatusCode < 500);
  return normalizedError;
}

function buildEmailPayload({ to, subject, text, html }) {
  return {
    from: env.mail.from,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  };
}

async function deliverMessage(client, payload, options = {}) {
  if (typeof client.sendMail === 'function') {
    return client.sendMail(payload);
  }

  const nestedSend = client?.emails?.['send'];
  if (typeof nestedSend === 'function') {
    const { data, error } = await nestedSend.call(client.emails, payload, {
      idempotencyKey: options.idempotencyKey,
    });

    if (error) {
      throw error;
    }

    return {
      messageId: data?.id || null,
      accepted: Array.isArray(payload.to) ? payload.to : [payload.to].filter(Boolean),
      rejected: [],
      response: null,
      data: data || null,
    };
  }

  throw new TypeError('mailClient.sendMail is not a function');
}

async function verifyTransporter(options = {}) {
  const client = options.client || transporter;
  const reason = options.reason || 'startup';

  if (client !== transporter || typeof client.verify !== 'function') {
    return true;
  }

  if (transporterVerified) {
    return true;
  }

  if (verifyPromise) {
    return verifyPromise;
  }

  verifyPromise = Promise.resolve()
    .then(() => client.verify())
    .then(() => {
      transporterVerified = true;
      logger.info('SMTP transporter verified', {
        provider: 'smtp',
        host: env.mail.host,
        port: env.mail.port,
        reason,
      });
      return true;
    })
    .catch((error) => {
      const normalizedError = normalizeProviderError(error);
      transporterVerified = false;
      logger.error('SMTP transporter verification failed', {
        provider: 'smtp',
        host: env.mail.host,
        port: env.mail.port,
        reason,
        code: normalizedError.code,
        providerCode: normalizedError.providerCode,
        statusCode: normalizedError.providerStatusCode,
        command: normalizedError.command,
        response: normalizedError.response,
        message: normalizedError.message,
        stack: error?.stack,
      });
      return false;
    })
    .finally(() => {
      verifyPromise = null;
    });

  return verifyPromise;
}

async function sendMailWithRetry(message, options = {}) {
  const mailClient = options.client || transporter;
  const retryAttempts = options.retryAttempts ?? env.mail.retryAttempts;
  const retryBackoffMs = options.retryBackoffMs ?? env.mail.retryBackoffMs;
  const idempotencyKey = options.idempotencyKey || randomUUID();
  let lastError = null;

  if (mailClient === transporter) {
    await verifyTransporter({ reason: 'first_send', client: mailClient });
  }

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const data = await deliverMessage(
        mailClient,
        {
          ...buildEmailPayload(message),
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
        },
        { idempotencyKey },
      );

      logger.info('Email sent', {
        provider: 'smtp',
        to: message.to,
        subject: message.subject,
        messageId: data?.messageId || null,
        attempt,
        idempotencyKey,
        accepted: data?.accepted || [],
        rejected: data?.rejected || [],
        response: data?.response || null,
      });

      return {
        messageId: data?.messageId || null,
        providerResponse: data || null,
      };
    } catch (error) {
      const normalizedError = normalizeProviderError(error);
      lastError = normalizedError;

      logger.warn('Email send attempt failed', {
        provider: 'smtp',
        to: message.to,
        subject: message.subject,
        attempt,
        retryAttempts,
        code: normalizedError.code,
        providerCode: normalizedError.providerCode,
        statusCode: normalizedError.providerStatusCode,
        retryable: Boolean(normalizedError.retryable),
        command: normalizedError.command,
        response: normalizedError.response,
        message: normalizedError.message,
        idempotencyKey,
        stack: error?.stack,
      });

      if (!normalizedError.retryable || attempt >= retryAttempts) {
        break;
      }

      await sleep(retryBackoffMs * attempt);
    }
  }

  logger.error('Email delivery failed after retries', {
    provider: 'smtp',
    to: message.to,
    subject: message.subject,
    retryAttempts,
    code: lastError?.code || null,
    providerCode: lastError?.providerCode || null,
    statusCode: lastError?.providerStatusCode ?? null,
    command: lastError?.command || null,
    response: lastError?.response || null,
    message: lastError?.message,
    idempotencyKey,
  });

  if (lastError instanceof AppError) {
    throw lastError;
  }

  const appError = new AppError(
    503,
    lastError?.publicCode || 'EMAIL_DELIVERY_FAILED',
    lastError?.publicMessage || 'We could not send the email right now. Please try again in a moment.',
  );
  appError.retryable = Boolean(lastError?.retryable);
  throw appError;
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

async function sendPasswordResetCodeEmail({ email, otp }) {
  const subject = 'Your password reset code';
  const expiryMinutes = Math.max(1, Math.round(env.otpExpirySeconds / 60));

  return sendMail({
    to: email,
    subject,
    text: `Your password reset code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px; background: #ffffff; color: #171717;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #525252;">Your password reset code</p>
        <div style="padding: 16px; border-radius: 12px; background: #f5f5f5; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
          ${otp}
        </div>
        <p style="margin: 16px 0 0; font-size: 14px; color: #525252;">
          This code expires in ${expiryMinutes} minutes. If you did not request a reset, you can ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = {
  buildEmailPayload,
  transporter,
  sendMail,
  sendMailWithRetry,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  verifyTransporter,
};

if (env.nodeEnv !== 'test') {
  void verifyTransporter({ reason: 'startup' });
}
