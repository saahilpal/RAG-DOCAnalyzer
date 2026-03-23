const admin = require('firebase-admin');

let firebaseApp = null;
let firebaseInitAttempted = false;

function missingFirebaseEnvVars() {
  const missing = [];

  if (!String(process.env.FIREBASE_PROJECT_ID || '').trim()) {
    missing.push('FIREBASE_PROJECT_ID');
  }

  if (!String(process.env.FIREBASE_CLIENT_EMAIL || '').trim()) {
    missing.push('FIREBASE_CLIENT_EMAIL');
  }

  if (!String(process.env.FIREBASE_PRIVATE_KEY || '').trim()) {
    missing.push('FIREBASE_PRIVATE_KEY');
  }

  return missing;
}

function initFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  if (firebaseInitAttempted) {
    return null;
  }

  firebaseInitAttempted = true;

  console.log('Firebase Key Exists:', !!process.env.FIREBASE_PRIVATE_KEY);

  const missingEnvVars = missingFirebaseEnvVars();
  if (missingEnvVars.length > 0) {
    console.warn(
      `Firebase not configured. Skipping initialization. Missing: ${missingEnvVars.join(', ')}`,
    );
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    console.log('Firebase initialized:', process.env.FIREBASE_PROJECT_ID);
    return firebaseApp;
  } catch (error) {
    console.error('Firebase init failed:', error.message);
    return null;
  }
}

function getAuth() {
  if (!firebaseApp) {
    initFirebase();
  }

  if (!firebaseApp) {
    return null;
  }

  return admin.auth(firebaseApp);
}

module.exports = {
  initFirebase,
  getAuth,
};
