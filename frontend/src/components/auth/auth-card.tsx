'use client';

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

function getFriendlyAuthMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'We could not reach the server. Check your connection and try again.';
    case 'EMAIL_DELIVERY_FAILED':
    case 'EMAIL_DELIVERY_UNAVAILABLE':
    case 'OTP_DELIVERY_FAILED':
      return 'We could not send a verification code right now. Please try again in a moment.';
    case 'OTP_REQUEST_RATE_LIMITED':
      return 'Too many code requests from this connection. Please wait a bit and try again.';
    case 'OTP_VERIFY_RATE_LIMITED':
      return 'Too many verification attempts from this connection. Please wait a bit and try again.';
    case 'OTP_EMAIL_HOURLY_LIMIT':
      return 'Too many codes have been sent to this email recently. Please try again in about an hour.';
    case 'OTP_RESEND_COOLDOWN':
      return 'A recent code is still active. Please wait a moment before requesting another one.';
    case 'OTP_INVALID':
      return 'That code does not look right. Check the email and try again.';
    case 'OTP_EXPIRED':
      return 'That code expired. Request a new one and try again.';
    case 'OTP_TOO_MANY_ATTEMPTS':
      return 'Too many incorrect tries. Request a new code to continue.';
    case 'AUTH_EXPIRED':
      return 'Your session expired. Request a new code to continue.';
    case 'AUTH_INVALID_TOKEN':
      return 'Your session is no longer valid. Please request a new code.';
    default:
      return error.message || fallback;
  }
}

export function AuthCard() {
  const router = useRouter();
  const { requestOtpForEmail, resendOtpForEmail, verifyOtpCode } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''));
  const [expiresInSeconds, setExpiresInSeconds] = useState(DEFAULT_EXPIRY_SECONDS);
  const [resendCooldownRemaining, setResendCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errorShakeKey, setErrorShakeKey] = useState(0);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmittedOtpRef = useRef('');
  const joinedOtp = useMemo(() => otpDigits.join(''), [otpDigits]);

  const setFriendlyError = useCallback((nextError: unknown, fallback: string) => {
    setError(getFriendlyAuthMessage(nextError, fallback));
    setErrorShakeKey((current) => current + 1);
  }, []);

  const handleVerifyOtp = useCallback(
    async (overrideOtp?: string) => {
      const otp = overrideOtp || joinedOtp;

      if (otp.length !== OTP_LENGTH) {
        setError('Enter the full 6-digit code.');
        setErrorShakeKey((current) => current + 1);
        return;
      }

      setLoading(true);
      setError('');

      try {
        await verifyOtpCode(email, otp);
        router.push('/app');
      } catch (submitError) {
        setFriendlyError(submitError, 'We could not verify that code. Please try again.');
        lastSubmittedOtpRef.current = '';
        resetOtpInputs();
        focusOtpIndex(0);
      } finally {
        setLoading(false);
      }
    },
    [email, joinedOtp, router, setFriendlyError, verifyOtpCode],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const persistedNotice = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);

    if (persistedNotice) {
      setNotice(persistedNotice);
      window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (step !== 'email') {
      return;
    }

    emailRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldownRemaining <= 0) {
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
    if (step !== 'otp') {
      return;
    }

    otpRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 'otp' || loading || joinedOtp.length !== OTP_LENGTH) {
      if (joinedOtp.length !== OTP_LENGTH) {
        lastSubmittedOtpRef.current = '';
      }
      return;
    }

    if (lastSubmittedOtpRef.current === joinedOtp) {
      return;
    }

    lastSubmittedOtpRef.current = joinedOtp;

    void handleVerifyOtp(joinedOtp);
  }, [handleVerifyOtp, joinedOtp, loading, step]);

  function resetOtpInputs() {
    lastSubmittedOtpRef.current = '';
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ''));
  }

  function focusOtpIndex(index: number) {
    otpRefs.current[index]?.focus();
    otpRefs.current[index]?.select();
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setErrorShakeKey((current) => current + 1);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await requestOtpForEmail(email);
      setStep('otp');
      setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      setResendCooldownRemaining(result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
      resetOtpInputs();
      setNotice(result.message);
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);

      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }

      setFriendlyError(submitError, 'We could not send a verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await resendOtpForEmail(email);
      setExpiresInSeconds(result.expiresInSeconds || DEFAULT_EXPIRY_SECONDS);
      setResendCooldownRemaining(result.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
      resetOtpInputs();
      setNotice(result.message);
      focusOtpIndex(0);
    } catch (submitError) {
      const retryAfterSeconds = getRetryAfterSeconds(submitError);

      if (retryAfterSeconds) {
        setResendCooldownRemaining(retryAfterSeconds);
      }

      setFriendlyError(submitError, 'We could not resend the verification code. Please try again.');
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.pageEnter}
      className="w-full max-w-md"
    >
      <Card className="p-8">
        <LogoMark className="mb-8" href="/" />

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {step === 'email' ? 'Continue with email' : 'Enter verification code'}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {step === 'email'
            ? 'We will send a secure 6-digit code to your email address. No password required.'
            : `Enter the 6-digit code sent to ${email}. It expires in ${Math.max(1, Math.round(expiresInSeconds / 60))} minutes.`}
        </p>

        <motion.div
          key={errorShakeKey}
          animate={error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.28 }}
        >
        {step === 'email' ? (
          <form className="mt-8 space-y-4" onSubmit={handleRequestOtp}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="email">
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
                  if (error) {
                    setError('');
                  }
                }}
                placeholder="you@company.com"
                maxLength={255}
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
	                  className="text-sm text-neutral-700"
	                >
	                  {error}
	                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending code...' : 'Send verification code'}
            </Button>
          </form>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Verification code</label>
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
                      if (error) {
                        setError('');
                      }
                    }}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    className="h-14 flex-1 text-center text-xl font-semibold tracking-[0.12em]"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

	            <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
	              <div className="flex items-center gap-2 text-sm text-neutral-600">
	                <Mail size={16} />
	                <span aria-live="polite">{notice || 'Check your inbox for the latest code.'}</span>
	              </div>

              <button
                type="button"
                className="text-sm font-medium text-neutral-900 disabled:text-neutral-400"
                disabled={loading || resendCooldownRemaining > 0}
                onClick={() => {
                  void handleResendOtp();
                }}
              >
                {resendCooldownRemaining > 0 ? `Resend in ${formatTimer(resendCooldownRemaining)}` : 'Resend'}
              </button>
            </div>

	            <AnimatePresence initial={false}>
	              {error ? (
	                <motion.p
	                  key={error}
	                  initial={{ opacity: 0, y: -4 }}
	                  animate={{ opacity: 1, y: 0 }}
	                  exit={{ opacity: 0, y: -4 }}
	                  role="alert"
	                  className="text-sm text-neutral-700"
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
                  setStep('email');
                  setError('');
                  setNotice('');
                  resetOtpInputs();
                }}
              >
                <ArrowLeft size={16} />
                Change email
              </Button>

              <Button
                type="button"
                className="flex-1"
                disabled={loading || joinedOtp.length !== OTP_LENGTH}
                onClick={() => {
                  void handleVerifyOtp();
                }}
              >
                {loading ? 'Verifying...' : 'Verify code'}
              </Button>
            </div>
          </div>
        )}
        </motion.div>
      </Card>
    </motion.div>
  );
}
