const { z } = require('zod');

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const otpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code.');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be at most 128 characters long.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/\d/, 'Password must include at least one number.');

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const verifySignupSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

const resendVerificationSchema = z.object({
  email: emailSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

module.exports = {
  signupSchema,
  verifySignupSchema,
  resendVerificationSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
