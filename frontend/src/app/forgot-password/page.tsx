import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { LogoMark } from '@/components/common/logo-mark';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params?.email || '';

  return (
    <main className="min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1360px] flex-col rounded-[32px] border border-[color:var(--line)] bg-[var(--panel)] shadow-[var(--shadow-soft)] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-6 sm:px-8 lg:px-12 lg:py-10">
          <div className="flex items-center justify-between">
            <LogoMark />
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Back to login
            </Link>
          </div>

          <div className="max-w-xl py-14">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Password reset</p>
            <h1 className="font-display mt-4 text-5xl font-semibold leading-[0.98] tracking-tight text-[var(--foreground)] sm:text-6xl">
              Reset your password securely.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
              Request a short verification code, set a new password, and return to your workspace.
            </p>
          </div>

          <div className="hidden rounded-[24px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-5 text-sm text-[var(--muted)] lg:block">
            Built for clarity with calm feedback and guided steps.
          </div>
        </section>

        <section className="flex items-center justify-center px-6 pb-8 pt-0 sm:px-8 lg:px-12 lg:py-10">
          <AuthCard mode="reset" prefilledEmail={email} />
        </section>
      </div>
    </main>
  );
}
