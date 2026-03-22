'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { transitions } from '@/lib/motion';

type AuthMode = 'login' | 'signup' | 'reset';
type AuthStep = 'form' | 'verify' | 'request' | 'complete';

const OTP_LENGTH = 6;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_EXPIRY_SECONDS = 300;
const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function getRetryAfterSeconds(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const details =
    typeof error.details === 'object' && error.details !== null
      ? (error.details as { retryAfterSeconds?: unknown })
      : null;

  if (typeof details?.retryAfterSeconds === 'number' && details.retryAfterSeconds > 0) {
    return Math.ceil(details.retryAfterSeconds);
  }

  return null;
}

function getPasswordValidationMessage(password: string) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }

  return null;
}

function getInitialStep(mode: AuthMode, initialStep?: AuthStep): AuthStep {
  if (mode === 'signup' && initialStep === 'verify') {
    return 'verify';
  }

  if (mode === 'reset') {
    return initialStep === 'verify' || initialStep === 'complete' ? initialStep : 'request';
  }

  return 'form';
}

function getFriendlyAuthMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'We could not reach the server. Check your connection and try again.';
    case 'EMAIL_DELIVERY_FAILED':
    case 'EMAIL_DELIVERY_UNAVAILABLE':
      return 'We could not send an email right now. Please try again in a moment.';
    case 'OTP_REQUEST_RATE_LIMITED':
      return 'Too many code requests from this connection. Please wait a bit and try again.';
    case 'OTP_VERIFY_RATE_LIMITED':
      return 'Too many verification attempts from this connection. Please wait a bit and try again.';
    case 'OTP_EMAIL_HOURLY_LIMIT':
      return 'Too many codes were sent recently. Please try again in about an hour.';
    case 'OTP_RESEND_COOLDOWN':
      return 'A recent code is still active. Please wait before requesting another one.';
    case 'OTP_INVALID':
      return 'That code does not look right. Check your email and try again.';
    case 'OTP_EXPIRED':
      return 'That code has expired. Request a fresh one and try again.';
    case 'OTP_TOO_MANY_ATTEMPTS':
      return 'Too many incorrect attempts. Request a fresh code to continue.';
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Verify your email before signing in.';
    case 'EMAIL_IN_USE':
      return 'An account with this email already exists.';
    case 'EMAIL_ALREADY_VERIFIED':
      return 'This email is already verified. Please sign in.';
    case 'AUTH_EXPIRED':
      return 'Your session expired. Please sign in again.';
    case 'AUTH_INVALID_TOKEN':
      return 'Your session is no longer valid. Please sign in again.';
    default:
      return error.message || fallback;
  }
}

export function AuthCard({
  mode = 'login',
  prefilledEmail = '',
  initialStep,
}: {
  mode?: AuthMode;
  prefilledEmail?: string;
  initialStep?: AuthStep;
}) {
  const router = useRouter();
  const {
    signUpWithPassword,
    resendSignupVerification,
    verifySignupCode,
    signInWithPassword,
    requestPasswordResetCode,
    resetPasswordWithCode,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>(getInitialStep(mode, initialStep));
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''));
  const [expiresInSeconds, setExpiresInSeconds] = useState(DEFAULT_EXPIRY_SECONDS);
  const [resendCooldownRemaining, setResendCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [errorShakeKey, setErrorShakeKey] = useState(0);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const joinedOtp = useMemo(() => otpDigits.join(''), [otpDigits]);
  const isVerificationStep = step === 'verify';
  const showPasswordFields = mode === 'login' || (mode === 'signup' && step === 'form');

  const setFriendlyError = useCallback((nextError: unknown, fallback: string) => {
    setAuthErrorCode(nextError instanceof ApiError ? nextError.code || null : null);
    setError(getFriendlyAuthMessage(nextError, fallback));
    setErrorShakeKey((current) => current + 1);
  }, []);

  const clearErrorState = useCallback(() => {
    setError('');
    setAuthErrorCode(null);
  }, []);

  const addDeliveryHint = useCallback((message: string) => {
    return `${message} Delivery can take up to a minute.`;
  }, []);

  const persistNotice = useCallback((message: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const persistedNotice = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
    if (!persistedNotice) {
      return;
    }

    setNotice(persistedNotice);
    window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  }, [mode]);

  useEffect(() => {
    if (step !== 'verify' || resendCooldownRemaining <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [resendCooldownRemaining, step]);

  useEffect(() => {
    if (step === 'verify') {
      otpRefs.current[0]?.focus();
      return;
    }

    emailRef.current?.focus();
  }, [step]);

  function resetOtpInputs() {
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ''));
  }

  function focusOtpIndex(index: number) {
    otpRefs.current[index]?.focus();
    otpRefs.current[index]?.select();
  }

  function validatePasswordMatch(left: string, right: string) {
    if (left !== right) {
      setError('Passwords must match.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return false;
    }

    const passwordMessage = getPasswordValidationMessage(left);
    if (passwordMessage) {
      setError(passwordMessage);
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return false;
    }

    return true;
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    setLoading(true);
    clearErrorState();
    setNotice('');

    try {
      await signInWithPassword(email, password);
      router.push('/app');
    } catch (submitError) {
      setFriendlyError(submitError, 'We could not sign you in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    if (!validatePasswordMatch(password, confirmPassword)) {
      return;
    }

    setLoading(true);
    clearErrorState();
    setNotice('');

    try {
      const result = await signUpWithPassword(email, password);
      setStep('verify');
      setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      setResendCooldownRemaining(result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
      resetOtpInputs();
      setNotice(result.message);
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);
      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }
      setFriendlyError(submitError, 'We could not create your account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySignup() {
    if (joinedOtp.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    setLoading(true);
    clearErrorState();

    try {
      await verifySignupCode(email, joinedOtp);
      router.push('/app');
    } catch (submitError) {
      setFriendlyError(submitError, 'We could not verify your code. Please try again.');
      resetOtpInputs();
      focusOtpIndex(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setLoading(true);
    clearErrorState();
    setNotice('');

    try {
      const result = await resendSignupVerification(email);
      setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      setResendCooldownRemaining(result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
      resetOtpInputs();
      setNotice(addDeliveryHint(result.message));
      focusOtpIndex(0);
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);
      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }
      setFriendlyError(submitError, 'We could not resend the code right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    setLoading(true);
    clearErrorState();
    setNotice('');

    try {
      const result = await requestPasswordResetCode(email);
      setStep('verify');
      setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      setResendCooldownRemaining(result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
      setNotice(addDeliveryHint(result.message));
      resetOtpInputs();
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);
      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }
      setFriendlyError(submitError, 'We could not start password reset right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (joinedOtp.length !== OTP_LENGTH) {
      setError('Enter the full 6-digit code.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    if (!validatePasswordMatch(newPassword, confirmNewPassword)) {
      return;
    }

    setLoading(true);
    clearErrorState();

    try {
      await resetPasswordWithCode(email, joinedOtp, newPassword);
      setStep('complete');
      setNotice('Password reset complete. You can sign in with your new password.');
    } catch (submitError) {
      setFriendlyError(submitError, 'We could not reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      focusOtpIndex(index + 1);
    }
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      event.preventDefault();
      focusOtpIndex(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusOtpIndex(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpIndex(index + 1);
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
      .split('');

    if (pastedDigits.length === 0) {
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];

      for (let index = 0; index < OTP_LENGTH; index += 1) {
        next[index] = pastedDigits[index] || '';
      }

      return next;
    });

    focusOtpIndex(Math.min(pastedDigits.length, OTP_LENGTH) - 1);
  }

  async function handleLoginResendVerification() {
    if (!isValidEmail(email)) {
      setError('Enter your email address to resend verification.');
      setAuthErrorCode(null);
      setErrorShakeKey((current) => current + 1);
      return;
    }

    setLoading(true);
    clearErrorState();
    setNotice('');

    try {
      const result = await resendSignupVerification(email);
      persistNotice(addDeliveryHint(result.message));
      router.push(`/signup?email=${encodeURIComponent(email)}&step=verify`);
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);
      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }
      setFriendlyError(submitError, 'We could not resend verification right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.pageEnter}
      className="w-full max-w-md"
    >
      <Card className="rounded-[28px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-8 shadow-[var(--shadow-soft)]">
        <LogoMark className="mb-8" href="/" />

        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {mode === 'login'
            ? 'Welcome back'
            : mode === 'signup'
              ? step === 'verify'
                ? 'Verify your email'
                : 'Create your account'
              : step === 'complete'
                ? 'Password reset complete'
                : step === 'verify'
                  ? 'Enter reset code'
                  : 'Reset your password'}
        </h1>

        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          {mode === 'login'
            ? 'Sign in with your email and password to continue.'
            : mode === 'signup'
              ? step === 'verify'
                ? `Enter the 6-digit code sent to ${email}. It expires in ${Math.max(1, Math.round(expiresInSeconds / 60))} minutes.`
                : 'Use email and password first. We will verify your email with a secure code.'
              : step === 'complete'
                ? 'Your password has been updated successfully.'
                : step === 'verify'
                  ? 'Enter the 6-digit code from your email and choose a new password. Delivery can take up to a minute.'
                  : 'We will send a secure reset code to your email. Delivery can take up to a minute.'}
        </p>

        <motion.div
          key={errorShakeKey}
          animate={error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.28 }}
        >
          {mode === 'login' ? (
            <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearErrorState();
                  }}
                  placeholder="you@company.com"
                  maxLength={255}
                  required
                />
              </div>

              {showPasswordFields ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="password">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearErrorState();
                    }}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <Link className="text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/forgot-password">
                  Forgot password?
                </Link>
                <Link className="text-[var(--foreground)] transition hover:opacity-70" href="/signup">
                  Create account
                </Link>
              </div>

              <AnimatePresence initial={false}>
                {notice ? (
                  <motion.p
                    key={`notice-${notice}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-[var(--muted)]"
                  >
                    {notice}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {error ? (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="text-sm text-[#9a3d3d]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {authErrorCode === 'EMAIL_NOT_VERIFIED' ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    void handleLoginResendVerification();
                  }}
                >
                  Resend verification code
                </Button>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : null}

          {mode === 'signup' && step === 'form' ? (
            <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearErrorState();
                  }}
                  placeholder="you@company.com"
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="signup-password">
                  Password
                </label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearErrorState();
                  }}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="confirm-password">
                  Confirm password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearErrorState();
                  }}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link className="text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/login">
                  Already have an account?
                </Link>
              </div>

              <AnimatePresence initial={false}>
                {error ? (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="text-sm text-[#9a3d3d]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          ) : null}

          {isVerificationStep ? (
            <div className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Verification code</label>
                <div className="flex gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => {
                        handleOtpChange(index, event.target.value);
                        clearErrorState();
                      }}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      className="h-14 flex-1 rounded-2xl text-center text-xl font-semibold tracking-[0.12em]"
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--line)] bg-[var(--panel)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Mail size={16} />
                  <span aria-live="polite">
                    {notice || 'Check your inbox for the latest code. Delivery can take up to a minute.'}
                  </span>
                </div>

                <button
                  type="button"
                  className="text-sm font-medium text-[var(--foreground)] disabled:text-[var(--muted)]"
                  disabled={loading || resendCooldownRemaining > 0}
                  onClick={() => {
                    if (mode === 'signup') {
                      void handleResendVerification();
                      return;
                    }

                    setLoading(true);
                    clearErrorState();
                    setNotice('');
                    void requestPasswordResetCode(email)
                      .then((result) => {
                        setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
                        setResendCooldownRemaining(
                          result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS,
                        );
                        setNotice(addDeliveryHint(result.message));
                        resetOtpInputs();
                      })
                      .catch((submitError) => {
                        const retryAfterSeconds = getRetryAfterSeconds(submitError);
                        if (retryAfterSeconds) {
                          setResendCooldownRemaining(retryAfterSeconds);
                        }
                        setFriendlyError(submitError, 'We could not resend the code right now.');
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                >
                  {resendCooldownRemaining > 0 ? `Resend in ${formatTimer(resendCooldownRemaining)}` : 'Resend'}
                </button>
              </div>

              {mode === 'reset' ? (
                <form className="space-y-4" onSubmit={handleResetPassword}>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="new-password">
                      New password
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        clearErrorState();
                      }}
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="confirm-new-password">
                      Confirm new password
                    </label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(event) => {
                        setConfirmNewPassword(event.target.value);
                        clearErrorState();
                      }}
                      placeholder="Confirm your new password"
                      required
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {error ? (
                      <motion.p
                        key={error}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        role="alert"
                        className="text-sm text-[#9a3d3d]"
                      >
                        {error}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setStep('request');
                        clearErrorState();
                        setNotice('');
                        resetOtpInputs();
                      }}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading || joinedOtp.length !== OTP_LENGTH}>
                      {loading ? 'Resetting...' : 'Reset password'}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {error ? (
                      <motion.p
                        key={error}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        role="alert"
                        className="text-sm text-[#9a3d3d]"
                      >
                        {error}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setStep('form');
                        clearErrorState();
                        setNotice('');
                        resetOtpInputs();
                      }}
                    >
                      <ArrowLeft size={16} />
                      Edit details
                    </Button>

                    <Button
                      type="button"
                      className="flex-1"
                      disabled={loading || joinedOtp.length !== OTP_LENGTH}
                      onClick={() => {
                        void handleVerifySignup();
                      }}
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {mode === 'reset' && step === 'request' ? (
            <form className="mt-8 space-y-4" onSubmit={handleRequestReset}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">
                  Email
                </label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearErrorState();
                  }}
                  placeholder="you@company.com"
                  maxLength={255}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link className="text-[var(--muted)] transition hover:text-[var(--foreground)]" href="/login">
                  Back to login
                </Link>
              </div>

              <AnimatePresence initial={false}>
                {notice ? (
                  <motion.p
                    key={`notice-${notice}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-[var(--muted)]"
                  >
                    {notice}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {error ? (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="text-sm text-[#9a3d3d]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending code...' : 'Send reset code'}
              </Button>
            </form>
          ) : null}

          {mode === 'reset' && step === 'complete' ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-[var(--muted)]">{notice}</p>
              <Button className="w-full" onClick={() => router.push('/login')}>
                Continue to sign in
              </Button>
            </div>
          ) : null}
        </motion.div>
      </Card>
    </motion.div>
  );
}
