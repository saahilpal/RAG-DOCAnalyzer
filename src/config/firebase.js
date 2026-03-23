const admin = require('firebase-admin');

const env = require('./env');

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('Firebase Key Exists:', !!rawPrivateKey);

if (!rawPrivateKey) {
  console.warn('Firebase not configured, skipping initialization');
} else if (!admin.apps.length && env.nodeEnv !== 'test') {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase not configured, skipping initialization');
    console.error('Firebase initialization failed:', error?.message || error);
  }
}

module.exports = admin;
