'use client';

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { ApiError } from '@/lib/api';

let persistenceReady = false;

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function assertFirebaseConfig() {
  const config = getFirebaseConfig();

  if (config.apiKey && config.authDomain && config.projectId && config.appId) {
    return config as {
      apiKey: string;
      authDomain: string;
      projectId: string;
      appId: string;
    };
  }

  throw new ApiError('Firebase client configuration is missing.', {
    status: 500,
    code: 'FIREBASE_CONFIG_MISSING',
  });
}

function getFirebaseApp(): FirebaseApp {
  const config = assertFirebaseConfig();
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

async function getConfiguredAuth() {
  const auth = getAuth(getFirebaseApp());

  if (!persistenceReady) {
    await setPersistence(auth, inMemoryPersistence);
    persistenceReady = true;
  }

  return auth;
}

function normalizeGoogleError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new ApiError('Google sign-in was cancelled.', {
      status: 400,
      code: 'GOOGLE_AUTH_CANCELLED',
    });
  }

  if (code === 'auth/popup-blocked') {
    return new ApiError('Popup was blocked. Allow popups and try again.', {
      status: 400,
      code: 'GOOGLE_AUTH_POPUP_BLOCKED',
    });
  }

  if (code === 'auth/network-request-failed') {
    return new ApiError('Network error while contacting Google. Please try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  return error instanceof Error
    ? error
    : new ApiError('Google sign-in failed.', {
        status: 500,
        code: 'GOOGLE_AUTH_FAILED',
      });
}

export async function signInWithGooglePopup() {
  const auth = await getConfiguredAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user.getIdToken();
  } catch (error) {
    throw normalizeGoogleError(error);
  }
}

export async function signOutFirebaseUser() {
  if (getApps().length === 0) {
    return;
  }

  const auth = getAuth(getApp());
  await signOut(auth);
}
