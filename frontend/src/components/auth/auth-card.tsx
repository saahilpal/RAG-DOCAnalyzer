'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { transitions } from '@/lib/motion';
import type { SocialProvider } from '@/lib/firebase';

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

function GithubMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-[var(--foreground)]" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.11.79-.25.79-.56 0-.28-.01-1.03-.02-2.02-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.71 1.27 3.37.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.29-5.24-5.73 0-1.27.45-2.3 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .98-.32 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.75.8 1.2 1.83 1.2 3.1 0 4.45-2.7 5.43-5.26 5.72.42.36.78 1.07.78 2.16 0 1.56-.02 2.82-.02 3.2 0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z"
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
      return 'Your social account did not return an email address.';
    case 'SOCIAL_AUTH_CANCELLED':
      return 'Sign-in was cancelled before completion.';
    case 'SOCIAL_AUTH_POPUP_BLOCKED':
      return 'Popup was blocked. Allow popups and try again.';
    case 'SOCIAL_AUTH_PROVIDER_MISMATCH':
      return 'This email is linked to a different provider. Use the original provider to sign in.';
    case 'FIREBASE_CONFIG_MISSING':
      return 'Firebase sign-in is not configured for this environment.';
    default:
      return error.message || fallback;
  }
}

export function AuthCard() {
  const router = useRouter();
  const { signInWithProvider } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  async function handleSocialSignIn(provider: SocialProvider) {
    setLoadingProvider(provider);
    setError('');
    setNotice('');

    try {
      await signInWithProvider(provider);
      router.push('/app');
    } catch (submitError) {
      setError(getFriendlyAuthMessage(submitError, 'We could not sign you in right now. Please try again.'));
    } finally {
      setLoadingProvider(null);
    }
  }

  const isLoading = loadingProvider !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.pageEnter}
      className="w-full max-w-md"
    >
      <Card className="rounded-[28px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-8 shadow-[var(--shadow-soft)]">
        <LogoMark className="mb-8" href="/" />

        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Secure workspace</p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Continue with social sign-in
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Sign in with Google or GitHub. DocAnalyzer keeps the existing backend session cookie flow.
        </p>

        <div className="mt-8 space-y-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center border-black/10 bg-white text-[var(--foreground)] shadow-[var(--shadow-panel)] hover:bg-neutral-100"
            onClick={() => {
              void handleSocialSignIn('google');
            }}
            disabled={isLoading}
          >
            <GoogleMark />
            {loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center border-black/10 bg-white text-[var(--foreground)] shadow-[var(--shadow-panel)] hover:bg-neutral-100"
            onClick={() => {
              void handleSocialSignIn('github');
            }}
            disabled={isLoading}
          >
            <GithubMark />
            {loadingProvider === 'github' ? 'Connecting...' : 'Continue with GitHub'}
          </Button>

          <p className="pt-1 text-xs leading-6 text-[var(--muted)]">
            Identity is verified by Firebase providers. API sessions remain managed by the backend cookie.
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
      </Card>
    </motion.div>
  );
}
