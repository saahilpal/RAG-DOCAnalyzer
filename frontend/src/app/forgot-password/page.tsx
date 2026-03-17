'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoMark } from '@/components/common/logo-mark';
import { transitions } from '@/lib/motion';
import { forgotPassword, resetPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function onRequestOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email, otp, newPassword });
      setSuccess('Password reset successfully! You can now log in.');
      setStep('request'); // Reset state but show success
      setEmail('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(20,20,20,0.07),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(20,20,20,0.05),transparent_30%)]" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.pageEnter}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <LogoMark className="mb-8" href="/" />

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {step === 'request' ? 'Reset your password' : 'Enter reset code'}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {step === 'request'
              ? 'Enter your email address and we will send you an OTP to reset your password.'
              : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
          </p>

          {success && (
            <div className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
              {success}
            </div>
          )}

          {step === 'request' ? (
            <form className="mt-8 space-y-4" onSubmit={onRequestOtp}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              {error && <p className="text-sm text-neutral-700">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onResetPassword}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="otp">
                  6-Digit Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  className="text-center text-xl tracking-[0.5em]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500 hover:text-neutral-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-neutral-700">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting password...' : 'Reset Password'}
              </Button>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
                onClick={() => setStep('request')}
              >
                <ArrowLeft size={14} />
                Back to email entry
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-neutral-600">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-medium text-neutral-900 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </motion.div>
    </main>
  );
}
