'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, getMe, requestOtp, resendOtp, signOut, verifyOtp, type User } from '@/lib/api';

const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  requestOtpForEmail: (email: string) => Promise<{
    message: string;
    expiresInSeconds: number;
    resendCooldownSeconds: number;
  }>;
  resendOtpForEmail: (email: string) => Promise<{
    message: string;
    expiresInSeconds: number;
    resendCooldownSeconds: number;
  }>;
  verifyOtpCode: (email: string, otp: string) => Promise<void>;
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
        error.message || 'Your session expired. Request a new code to continue.',
      );
    }

    void signOut().catch(() => {});
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
      const message =
        customEvent.detail?.message || 'Your session expired. Request a new code to continue.';

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
      }

      setUser(null);
      void signOut().catch(() => {});
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

  const requestOtpForEmail = useCallback(async (email: string) => {
    return requestOtp(email);
  }, []);

  const resendOtpForEmail = useCallback(async (email: string) => {
    return resendOtp(email);
  }, []);

  const verifyOtpCode = useCallback(async (email: string, otp: string) => {
    const data = await verifyOtp(email, otp);
    setUser(data.user);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      requestOtpForEmail,
      resendOtpForEmail,
      verifyOtpCode,
      signOutUser,
      refreshUser,
    }),
    [loading, refreshUser, requestOtpForEmail, resendOtpForEmail, signOutUser, user, verifyOtpCode],
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
