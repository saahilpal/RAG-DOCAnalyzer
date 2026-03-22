import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/auth-card';

const authMocks = vi.hoisted(() => ({
  signUpWithPassword: vi.fn(),
  resendSignupVerification: vi.fn(),
  verifySignupCode: vi.fn(),
  signInWithPassword: vi.fn(),
  requestPasswordResetCode: vi.fn(),
  resetPasswordWithCode: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => authMocks,
}));

describe('AuthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    authMocks.signUpWithPassword.mockResolvedValue({
      message: 'Verification code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });
    authMocks.resendSignupVerification.mockResolvedValue({
      message: 'Fresh verification code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });
    authMocks.verifySignupCode.mockResolvedValue(undefined);
    authMocks.signInWithPassword.mockResolvedValue(undefined);
    authMocks.requestPasswordResetCode.mockResolvedValue({
      message: 'Reset code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });
    authMocks.resetPasswordWithCode.mockResolvedValue(undefined);
  });

  it('submits signup then verifies OTP code', async () => {
    render(<AuthCard mode="signup" />);

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'SecurePass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'SecurePass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await screen.findByText(/verify your email/i);

    for (let index = 1; index <= 6; index += 1) {
      fireEvent.change(screen.getByLabelText(`Digit ${index}`), {
        target: { value: String(index) },
      });
    }

    fireEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(authMocks.verifySignupCode).toHaveBeenCalledWith('user@example.com', '123456');
    });

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/app');
    });
  });

  it('shows friendly login error on invalid credentials', async () => {
    authMocks.signInWithPassword.mockRejectedValue(
      new ApiError('Invalid', {
        status: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
      }),
    );

    render(<AuthCard mode="login" />);

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByText('Email or password is incorrect.');
  });

  it('offers resend verification after an unverified login attempt', async () => {
    authMocks.signInWithPassword.mockRejectedValue(
      new ApiError('Verify first', {
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
      }),
    );
    authMocks.resendSignupVerification.mockResolvedValue({
      message: 'Verification code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });

    render(<AuthCard mode="login" />);

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'SecurePass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByText('Verify your email before signing in.');

    fireEvent.click(screen.getByRole('button', { name: /resend verification code/i }));

    await waitFor(() => {
      expect(authMocks.resendSignupVerification).toHaveBeenCalledWith('user@example.com');
    });

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/signup?email=user%40example.com&step=verify');
    });
  });
});
