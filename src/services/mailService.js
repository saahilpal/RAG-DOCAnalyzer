const nodemailer = require('nodemailer');

const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

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

function createSmtpMailProvider() {
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth:
      env.smtp.user && env.smtp.pass
        ? {
            user: env.smtp.user,
            pass: env.smtp.pass,
          }
        : undefined,
  });

  return {
    name: 'smtp',
    async send({ to, subject, text, html }) {
      return transporter.sendMail({
        from: env.smtp.from,
        to,
        subject,
        text,
        html,
      });
    },
  };
}

function createMailProvider() {
  if (!env.smtp.host || !env.smtp.port) {
    return createUnavailableMailProvider();
  }

  return createSmtpMailProvider();
}

const provider = createMailProvider();

async function sendMailWithRetry(message) {
  let lastError = null;

  for (let attempt = 1; attempt <= env.smtp.retryAttempts; attempt += 1) {
    try {
      const info = await provider.send(message);

      logger.info('Email sent', {
        provider: provider.name,
        to: message.to,
        subject: message.subject,
        messageId: info?.messageId || null,
        attempt,
      });

      return info;
    } catch (error) {
      lastError = error;

      logger.warn('Email send attempt failed', {
        provider: provider.name,
        to: message.to,
        subject: message.subject,
        attempt,
        retryAttempts: env.smtp.retryAttempts,
        code: error.code,
        message: error.message,
      });

      if (error instanceof AppError && error.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
        logger.error('Email delivery is unavailable', {
          provider: provider.name,
          to: message.to,
          subject: message.subject,
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      if (attempt < env.smtp.retryAttempts) {
        await sleep(env.smtp.retryBackoffMs * attempt);
      }
    }
  }

  logger.error('Email delivery failed after retries', {
    provider: provider.name,
    to: message.to,
    subject: message.subject,
    retryAttempts: env.smtp.retryAttempts,
    code: lastError?.code,
    message: lastError?.message,
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
  sendMail,
  sendVerificationCodeEmail,
};
