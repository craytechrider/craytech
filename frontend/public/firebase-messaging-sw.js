importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyC3IaoB2H0k9fQcFsaIC_WocenSkcR-aUQ",
  authDomain: "crane-b8378.firebaseapp.com",
  databaseURL:
    "https://crane-b8378-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crane-b8378",
  storageBucket: "crane-b8378.firebasestorage.app",
  messagingSenderId: "1012992578285",
  appId: "1:101299257828:web:ae77e4d54274bbbfd9f2e4",
  measurementId: "G-X5Z9CR7Q26",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "CRAYTECH Notification";

  const options = {
    body:
      payload.notification?.body ||
      payload.data?.message ||
      "You have a new notification.",
    icon: "/favicon.ico",
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        return clients.openWindow("/");
      }),
  );
});
