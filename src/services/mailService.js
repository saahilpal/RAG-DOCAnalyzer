const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

async function sendMail({ to, subject, text, html }) {
  if (!env.smtp.host) {
    logger.warn('SMTP not configured. Skipping email send.', { to, subject });
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
    });

    logger.info('Email sent', { messageId: info.messageId, to });
    return info;
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      message: error.message,
    });
    throw error;
  }
}

async function sendOtpEmail(email, otp) {
  return sendMail({
    to: email,
    subject: 'Your Password Reset OTP - DocAnalyzer',
    text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>You requested a password reset. Use the OTP below to proceed:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendMail,
  sendOtpEmail,
};
