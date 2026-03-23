import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/auth-card';

const authMocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
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
    authMocks.signInWithGoogle.mockResolvedValue(undefined);
  });

  it('starts Google sign-in and routes to the workspace on success', async () => {
    render(<AuthCard mode="login" />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(authMocks.signInWithGoogle).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/app');
    });
  });

  it('shows a friendly popup-blocked error', async () => {
    authMocks.signInWithGoogle.mockRejectedValue(
      new ApiError('Popup blocked', {
        status: 400,
        code: 'GOOGLE_AUTH_POPUP_BLOCKED',
      }),
    );

    render(<AuthCard mode="login" />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await screen.findByText('Popup was blocked. Allow popups and try again.');
  });

  it('shows reset-mode copy without password fields', () => {
    render(<AuthCard mode="reset" />);

    expect(screen.getByText('Passwords are no longer used')).toBeTruthy();
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
  });
});
