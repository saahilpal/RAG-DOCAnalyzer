'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { transitions } from '@/lib/motion';

type AuthMode = 'login' | 'signup' | 'reset';

const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.72-.06-1.25-.2-1.81H12v3.48h5.64c-.12.86-.77 2.15-2.22 3.02l-.02.12 3.29 2.55.23.02c2.1-1.93 3.31-4.78 3.31-8.38Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.23-2.5c-.86.6-2.02 1.02-3.54 1.02-2.7 0-4.98-1.78-5.8-4.24l-.11.01-3.42 2.65-.04.1A10.23 10.23 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.2 13.81A6.14 6.14 0 0 1 5.87 12c0-.63.11-1.24.31-1.81l-.01-.12-3.46-2.7-.11.05A10 10 0 0 0 2 12c0 1.6.38 3.12 1.05 4.43l3.15-2.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.95c1.92 0 3.21.83 3.95 1.53l2.88-2.81C17.07 3.05 14.76 2 12 2a10.23 10.23 0 0 0-9.36 5.58l3.58 2.77C7 7.72 9.3 5.95 12 5.95Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getFriendlyAuthMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'We could not reach the server. Check your connection and try again.';
    case 'AUTH_REQUIRED':
    case 'AUTH_EXPIRED':
    case 'AUTH_INVALID_TOKEN':
      return 'Your session expired. Please sign in again.';
    case 'AUTH_EMAIL_REQUIRED':
      return 'Your Google account did not return an email address.';
    case 'GOOGLE_AUTH_CANCELLED':
      return 'Google sign-in was cancelled before completion.';
    case 'GOOGLE_AUTH_POPUP_BLOCKED':
      return 'Popup was blocked. Allow popups and try again.';
    case 'FIREBASE_CONFIG_MISSING':
      return 'Google sign-in is not configured for this environment.';
    default:
      return error.message || fallback;
  }
}

function getModeCopy(mode: AuthMode) {
  if (mode === 'signup') {
    return {
      eyebrow: 'Create account',
      title: 'Continue with Google',
      description: 'Use your Google account to create a workspace and start chatting with documents immediately.',
      buttonLabel: 'Continue with Google',
      footerLabel: 'Already have access?',
      footerHref: '/login',
      footerText: 'Sign in',
    };
  }

  if (mode === 'reset') {
    return {
      eyebrow: 'Account access',
      title: 'Passwords are no longer used',
      description: 'Sign in with the Google account attached to your workspace. Session management stays on DocAnalyzer.',
      buttonLabel: 'Continue with Google',
      footerLabel: 'Need the main sign-in screen?',
      footerHref: '/login',
      footerText: 'Back to login',
    };
  }

  return {
    eyebrow: 'Secure workspace',
    title: 'Continue with Google',
    description: 'Use your Google account to restore your workspace and continue document conversations.',
    buttonLabel: 'Continue with Google',
    footerLabel: 'New to DocAnalyzer?',
    footerHref: '/signup',
    footerText: 'Create access',
  };
}

export function AuthCard({ mode = 'login' }: { mode?: AuthMode }) {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const copy = getModeCopy(mode);

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
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      await signInWithGoogle();
      router.push('/app');
    } catch (submitError) {
      setError(getFriendlyAuthMessage(submitError, 'We could not sign you in right now. Please try again.'));
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

        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{copy.eyebrow}</p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{copy.description}</p>

        <div className="mt-8 space-y-4">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center border-black/10 bg-white text-[var(--foreground)] hover:bg-neutral-100"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleMark />
            {loading ? 'Connecting...' : copy.buttonLabel}
          </Button>

          <p className="text-xs leading-6 text-[var(--muted)]">
            Google verifies identity. DocAnalyzer keeps the app session in the existing secure cookie flow.
          </p>

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
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[color:var(--line)] pt-5 text-sm">
          <span className="text-[var(--muted)]">{copy.footerLabel}</span>
          <Link className="inline-flex items-center gap-1.5 text-[var(--foreground)] transition hover:opacity-70" href={copy.footerHref}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {copy.footerText}
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
