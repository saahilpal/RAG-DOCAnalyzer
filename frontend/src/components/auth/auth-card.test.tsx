import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/auth-card';

const authMocks = vi.hoisted(() => ({
  requestOtpForEmail: vi.fn(),
  resendOtpForEmail: vi.fn(),
  verifyOtpCode: vi.fn(),
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

    authMocks.requestOtpForEmail.mockResolvedValue({
      message: 'Verification code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });
    authMocks.resendOtpForEmail.mockResolvedValue({
      message: 'Fresh verification code sent.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    });
    authMocks.verifyOtpCode.mockResolvedValue(undefined);
  });

  it('pastes a full OTP and auto-submits it', async () => {
    render(<AuthCard />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }).closest('form')!);

    await screen.findByText(/enter verification code/i);

    const firstDigitInput = screen.getByLabelText('Digit 1');

    fireEvent.paste(firstDigitInput, {
      clipboardData: {
        getData: () => '123456',
      },
    });

    await waitFor(() => {
      expect(authMocks.verifyOtpCode).toHaveBeenCalledWith('user@example.com', '123456');
    });

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/app');
    });
  });

  it('shows friendly OTP errors and clears the code after a failed auto-submit', async () => {
    authMocks.verifyOtpCode.mockRejectedValue(
      new ApiError('Expired', {
        status: 401,
        code: 'OTP_EXPIRED',
      }),
    );

    render(<AuthCard />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }).closest('form')!);

    await screen.findByText(/enter verification code/i);

    fireEvent.paste(screen.getByLabelText('Digit 1'), {
      clipboardData: {
        getData: () => '123456',
      },
    });

    await screen.findByText('That code expired. Request a new one and try again.');

    await waitFor(() => {
      expect((screen.getByLabelText('Digit 1') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Digit 6') as HTMLInputElement).value).toBe('');
    });
  });
});
