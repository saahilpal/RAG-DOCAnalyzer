'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  changePassword,
  getMe,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signIn,
  signOut,
  signUp,
  verifySignup,
  type OtpDeliveryMeta,
  type User,
} from '@/lib/api';

const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signUpWithPassword: (email: string, password: string) => Promise<OtpDeliveryMeta>;
  resendSignupVerification: (email: string) => Promise<OtpDeliveryMeta>;
  verifySignupCode: (email: string, otp: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  requestPasswordResetCode: (email: string) => Promise<OtpDeliveryMeta>;
  resetPasswordWithCode: (email: string, otp: string, newPassword: string) => Promise<void>;
  changePasswordForUser: (currentPassword: string, newPassword: string) => Promise<void>;
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

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    return signUp(email, password);
  }, []);

  const resendSignupVerification = useCallback(async (email: string) => {
    return resendVerification(email);
  }, []);

  const verifySignupCode = useCallback(async (email: string, otp: string) => {
    const data = await verifySignup(email, otp);
    setUser(data.user);
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const data = await signIn(email, password);
    setUser(data.user);
  }, []);

  const requestPasswordResetCode = useCallback(async (email: string) => {
    return requestPasswordReset(email);
  }, []);

  const resetPasswordWithCode = useCallback(async (email: string, otp: string, newPassword: string) => {
    await resetPassword(email, otp, newPassword);
  }, []);

  const changePasswordForUser = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePassword(currentPassword, newPassword);
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
      signUpWithPassword,
      resendSignupVerification,
      verifySignupCode,
      signInWithPassword,
      requestPasswordResetCode,
      resetPasswordWithCode,
      changePasswordForUser,
      signOutUser,
      refreshUser,
    }),
    [
      changePasswordForUser,
      loading,
      refreshUser,
      requestPasswordResetCode,
      resendSignupVerification,
      resetPasswordWithCode,
      signInWithPassword,
      signOutUser,
      signUpWithPassword,
      user,
      verifySignupCode,
    ],
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
