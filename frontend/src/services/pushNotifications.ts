import { getToken, onMessage } from "firebase/messaging";
import { messagingPromise } from "../firebase";
import api from "../lib/api";

const VAPID_KEY =
  "BOaUAqGjvdiMhYUTikzifV7YCsv2XgUvMtBn5BMn8saenDLMd5ghyfaJE_QwWVLD7anp_-qZrFJeJ03_etUuc3M";

function getDeviceName(): string {
  const userAgent = navigator.userAgent;

  const browser = userAgent.includes("Edg")
    ? "Edge"
    : userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Safari")
          ? "Safari"
          : "Browser";

  return `${navigator.platform || "Unknown"} - ${browser}`;
}

async function registerFcmToken(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    console.warn("Push notifications require a supported browser and HTTPS.");
    return null;
  }

  const messaging = await messagingPromise;

  if (!messaging) {
    console.warn("Firebase Messaging is not supported in this browser.");
    return null;
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );

  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    console.warn("Firebase did not generate an FCM token.");
    return null;
  }

  await api.post("/device-tokens", {
    token,
    device_name: getDeviceName(),
  });

  console.log("CRAYTECH push token registered successfully.");
  return token;
}

/**
 * Call this function directly from the user's Enable Notifications button.
 * The browser permission prompt must be triggered by a user interaction.
 */
export async function enablePushNotifications(): Promise<string | null> {
  try {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications.");
      return null;
    }

    let permission = Notification.permission;

    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("Notification permission was not granted.");
      return null;
    }

    return await registerFcmToken();
  } catch (error) {
    console.error("Unable to enable CRAYTECH push notifications:", error);
    return null;
  }
}

/**
 * Silently register/refresh the FCM token if browser permission
 * has already been granted. This function does not request permission.
 */
export async function registerIfAlreadyAllowed(): Promise<string | null> {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return null;
    }

    return await registerFcmToken();
  } catch (error) {
    console.error("Unable to refresh CRAYTECH push token:", error);
    return null;
  }
}

export async function listenForForegroundMessages(
  callback: (payload: any) => void,
): Promise<(() => void) | null> {
  try {
    const messaging = await messagingPromise;

    if (!messaging) {
      return null;
    }

    return onMessage(messaging, (payload) => {
      console.log("CRAYTECH foreground notification:", payload);
      callback(payload);
    });
  } catch (error) {
    console.error("Foreground notification listener failed:", error);
    return null;
  }
}
