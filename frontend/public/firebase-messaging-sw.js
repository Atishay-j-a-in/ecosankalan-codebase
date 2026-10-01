importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js"
);



// Push is optional. The vite plugin replaces __VITE_*__ with real values at
// build/dev time; when unconfigured they stay empty — skip init instead of
// throwing (an uncaught throw here surfaces as FirebaseError in the console).
var __FCM_CONFIG__ = {
  apiKey: "__VITE_FIREBASE_API_KEY__",
  authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__",
  projectId: "__VITE_FIREBASE_PROJECT_ID__",
  storageBucket: "__VITE_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__VITE_FIREBASE_APP_ID__",
};

var __FCM_ENABLED__ = Boolean(
  __FCM_CONFIG__.apiKey &&
  __FCM_CONFIG__.projectId &&
  __FCM_CONFIG__.apiKey.indexOf('__VITE_') !== 0
);

if (__FCM_ENABLED__) {
firebase.initializeApp(__FCM_CONFIG__);

const messaging = firebase.messaging();

self.addEventListener("install", () => self.skipWaiting());

messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
  
    self.registration.showNotification(
        notification.title || "Notification",
        {
            body: notification.body || "",
            icon: "/logo.png",
        }
    );

    self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
            clients.forEach((client) =>
                client.postMessage({ type: "FCM_NOTIFICATION", payload })
            );
        });
});

} // __FCM_ENABLED__

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (client) => client.url.includes(self.location.origin) && client.focus
        );
        if (existing) {
          return existing.focus().then((client) =>
            client.navigate(urlToOpen)
          );
        }
        return clients.openWindow(urlToOpen);
      })
  );
});