'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, signIn, signOut, signUp, type User } from '@/lib/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const data = await getMe();
        if (active) {
          setUser(data.user);
        }
      } catch {
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
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const data = await signIn(email, password);
    setUser(data.user);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const data = await signUp(email, password);
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
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
      refreshUser,
    }),
    [loading, refreshUser, signInWithEmail, signOutUser, signUpWithEmail, user],
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
