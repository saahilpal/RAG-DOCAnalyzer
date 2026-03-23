import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/auth-card';

const authMocks = vi.hoisted(() => ({
  signInWithProvider: vi.fn(),
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
    authMocks.signInWithProvider.mockResolvedValue(undefined);
  });

  it('starts Google sign-in and routes to the workspace on success', async () => {
    render(<AuthCard />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(authMocks.signInWithProvider).toHaveBeenCalledWith('google');
    });

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/app');
    });
  });

  it('starts GitHub sign-in and routes to the workspace on success', async () => {
    render(<AuthCard />);

    fireEvent.click(screen.getByRole('button', { name: /continue with github/i }));

    await waitFor(() => {
      expect(authMocks.signInWithProvider).toHaveBeenCalledWith('github');
    });
  });

  it('shows a friendly popup-blocked error', async () => {
    authMocks.signInWithProvider.mockRejectedValue(
      new ApiError('Popup blocked', {
        status: 400,
        code: 'SOCIAL_AUTH_POPUP_BLOCKED',
      }),
    );

    render(<AuthCard />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await screen.findByText('Popup was blocked. Allow popups and try again.');
  });
});
