// Single service worker at scope "/" — a page can only have one active SW
// per scope, so this covers both push (Firebase) and the offline shell
// fallback instead of registering two separate workers.
//
// Deliberately does NOT precache _next/static JS/CSS chunks: those are
// content-hashed per deploy, and a stale-while-revalidate cache of them is
// the classic way a PWA breaks itself for returning users after a deploy
// (serving old chunk A alongside new chunk B). The only thing cached here is
// a static, dependency-free offline fallback page.

const OFFLINE_CACHE = "ropinder-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // only guard page navigations, nothing else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

// Firebase Cloud Messaging — only initialized when registered with its config
// query params (see lib/firebaseClient.ts registerPushToken()). The offline
// shell above works even when this SW is registered without them.
const params = new URL(self.location.href).searchParams;
if (params.get("apiKey")) {
  importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

  firebase.initializeApp({
    apiKey: params.get("apiKey"),
    authDomain: `${params.get("projectId")}.firebaseapp.com`,
    projectId: params.get("projectId"),
    storageBucket: params.get("storageBucket"),
    messagingSenderId: params.get("messagingSenderId"),
    appId: params.get("appId"),
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? "Ropinder";
    const body = payload.notification?.body ?? "";
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      data: { link: payload.data?.link ?? "/" },
    });
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const link = event.notification.data?.link ?? "/";
    event.waitUntil(self.clients.openWindow(link));
  });
}
