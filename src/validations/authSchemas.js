const { z } = require('zod');

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const otpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code.');

const requestOtpSchema = z.object({
  email: emailSchema,
});

const resendOtpSchema = z.object({
  email: emailSchema,
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

module.exports = {
  requestOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
};
