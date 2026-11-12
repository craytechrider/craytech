import { initializeApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "firebase/analytics";
import { getDatabase } from "firebase/database";
import {
  getMessaging,
  isSupported as isMessagingSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyC3IaoB2H0k9fQcFsaIC_WocenSkcR-aUQ",
  authDomain: "crane-b8378.firebaseapp.com",
  databaseURL:
    "https://crane-b8378-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crane-b8378",
  storageBucket: "crane-b8378.firebasestorage.app",
  messagingSenderId: "1012992578285",
  appId: "1:1012992578285:web:ae77e4d54274bbbfd9f2e4",
  measurementId: "G-X5Z9CR7Q26",
};

export const app = initializeApp(firebaseConfig);

// Keep the existing IoT Realtime Database connection.
export const db = getDatabase(app);

// Analytics is optional and only initialized where supported.
export const analyticsPromise = isAnalyticsSupported()
  .then((supported) => (supported ? getAnalytics(app) : null))
  .catch(() => null);

// Messaging is only supported in compatible browser environments.
export const messagingPromise = isMessagingSupported()
  .then((supported) => (supported ? getMessaging(app) : null))
  .catch(() => null);
