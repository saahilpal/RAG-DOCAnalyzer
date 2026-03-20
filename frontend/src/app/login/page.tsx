'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [loading, router, user]);

  return (
    <main className="min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1360px] flex-col rounded-[36px] border border-[color:var(--line)] bg-[rgba(255,250,244,0.72)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-6 sm:px-8 lg:px-12 lg:py-10">
          <div className="flex items-center justify-between">
            <LogoMark />
            <Link href="/" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Back home
            </Link>
          </div>

          <div className="max-w-xl py-14">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Passwordless sign in</p>
            <h1 className="font-display mt-4 text-5xl font-semibold leading-[0.98] tracking-tight text-[var(--foreground)] sm:text-6xl">
              Pick up your chats exactly where you left them.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              Sign in with email, attach documents, and keep every answer in one calm workspace.
            </p>
          </div>

          <div className="hidden rounded-[28px] border border-[color:var(--line)] bg-[rgba(255,252,247,0.78)] p-5 text-sm text-[var(--muted)] lg:block">
            Passwordless access. Secure cookies. Streaming answers. No setup friction.
          </div>
        </section>

        <section className="flex items-center justify-center px-6 pb-8 pt-0 sm:px-8 lg:px-12 lg:py-10">
          <AuthCard />
        </section>
      </div>
    </main>
  );
}
