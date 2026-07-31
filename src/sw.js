import { precacheAndRoute } from "workbox-precaching";

// Απαραίτητο για το vite-plugin-pwa (injectManifest strategy)
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Λήψη push μηνύματος από τον server και εμφάνιση ειδοποίησης συστήματος
self.addEventListener("push", (event) => {
  let data = { title: "Σύστημα Προσκόπων", body: "Νέα ειδοποίηση" };
  try { data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Σύστημα Προσκόπων", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

// Όταν ο χρήστης πατάει πάνω στην ειδοποίηση, ανοίγει/επαναφέρει την εφαρμογή
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
