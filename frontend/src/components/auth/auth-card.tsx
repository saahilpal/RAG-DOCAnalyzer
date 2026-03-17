'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { transitions } from '@/lib/motion';

type AuthCardProps = {
  mode: 'login' | 'signup';
};

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace';
  const actionLabel = mode === 'login' ? 'Sign In' : 'Create Account';

  const isFormValid = useMemo(
    () => isValidEmail(email) && password.trim().length >= 8,
    [email, password],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }

      router.push('/app');
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Authentication failed.');
      }
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
      <Card className="p-8">
        <LogoMark className="mb-8" href="/" />

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Upload documents and ask AI questions with source-grounded responses.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700" htmlFor="password">
                Password
              </label>
              {mode === 'login' && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-neutral-600 transition hover:text-neutral-900"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                maxLength={128}
                className="pr-11"
              />

              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500 transition hover:text-neutral-700"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-neutral-700">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : actionLabel}
          </Button>
        </form>

        <p className="mt-6 text-sm text-neutral-600">
          {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
          <Link
            href={mode === 'login' ? '/signup' : '/login'}
            className="font-medium text-neutral-900 underline-offset-4 hover:underline"
          >
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </Link>
        </p>
      </Card>
    </motion.div>
  );
}
