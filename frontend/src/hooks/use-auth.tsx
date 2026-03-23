'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, getMe, signInWithSocial as exchangeSocialToken, signOut, type User } from '@/lib/api';
import { signInWithProviderPopup, signOutFirebaseUser, type SocialProvider } from '@/lib/firebase';

const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSessionError = useCallback((error: unknown) => {
    if (!(error instanceof ApiError)) {
      return;
    }

    if (error.code !== 'AUTH_EXPIRED' && error.code !== 'AUTH_INVALID_TOKEN') {
      return;
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        AUTH_NOTICE_STORAGE_KEY,
        error.message || 'Your session expired. Please sign in again.',
      );
    }

    void signOut().catch(() => {});
    void signOutFirebaseUser().catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (error) {
      handleSessionError(error);
      setUser(null);
    }
  }, [handleSessionError]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const data = await getMe();
        if (active) {
          setUser(data.user);
        }
      } catch (error) {
        handleSessionError(error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap().catch(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [handleSessionError]);

  useEffect(() => {
    function handleAuthExpired(event: Event) {
      const customEvent = event as CustomEvent<{ message?: string }>;
      const message = customEvent.detail?.message || 'Your session expired. Please sign in again.';

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
      }

      setUser(null);
      void signOut().catch(() => {});
      void signOutFirebaseUser().catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:expired', handleAuthExpired as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:expired', handleAuthExpired as EventListener);
      }
    };
  }, []);

  const signInWithProvider = useCallback(async (provider: SocialProvider) => {
    try {
      const idToken = await signInWithProviderPopup(provider);
      const data = await exchangeSocialToken(idToken);
      setUser(data.user);
    } catch (error) {
      void signOutFirebaseUser().catch(() => {});
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut();
    } finally {
      void signOutFirebaseUser().catch(() => {});
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithProvider,
      signOutUser,
      refreshUser,
    }),
    [loading, refreshUser, signInWithProvider, signOutUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
