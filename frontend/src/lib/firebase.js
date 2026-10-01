import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Push notifications are optional. If Firebase isn't configured (e.g. local
// dev without VITE_FIREBASE_*), export null instead of throwing at import
// time — an uncaught throw here would unmount the entire React tree and
// leave the splash screen stuck forever.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let messaging = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('[firebase] init failed, push disabled:', err?.message || err);
    messaging = null;
  }
} else if (import.meta.env.DEV) {
  console.warn('[firebase] VITE_FIREBASE_* not set, push notifications disabled.');
}

export { messaging };
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;