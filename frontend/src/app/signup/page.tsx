'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';

function SignupCardShell() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get('email') || '';
  const initialStep = searchParams.get('step') === 'verify' ? 'verify' : 'form';

  return <AuthCard mode="signup" prefilledEmail={prefilledEmail} initialStep={initialStep} />;
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [loading, router, user]);

  return (
    <main className="relative min-h-screen overflow-hidden px-3 py-3 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-7rem] top-[-3rem] h-56 w-56 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute bottom-0 right-[-6rem] h-60 w-60 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1360px] flex-col rounded-[28px] border border-[color:var(--line)] bg-[rgba(247,244,238,0.94)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-6 sm:px-8 lg:px-12 lg:py-10">
          <div className="flex items-center justify-between">
            <LogoMark />
            <Link href="/" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Back home
            </Link>
          </div>

          <div className="max-w-xl py-10 lg:py-14">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Create account</p>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-[0.98] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Join the workspace in under a minute.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              Register with email and password, verify once, and start chatting with your documents immediately.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-sm text-[var(--muted)]">
                Upload PDFs
              </div>
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-sm text-[var(--muted)]">
                Ask follow-up questions
              </div>
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-sm text-[var(--muted)]">
                Stay grounded in the file
              </div>
            </div>
          </div>

          <div className="hidden rounded-[24px] border border-[color:var(--line)] bg-white/80 p-5 text-sm leading-6 text-[var(--muted)] shadow-[var(--shadow-panel)] lg:block">
            Smooth verification flow with clear feedback and zero clutter.
          </div>
        </section>

        <section className="flex items-center justify-center px-6 pb-8 pt-0 sm:px-8 lg:px-12 lg:py-10">
          <Suspense fallback={<AuthCard mode="signup" />}>
            <SignupCardShell />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
