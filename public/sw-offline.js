// Offline-shell-only worker, registered unconditionally on every visit
// (components/ServiceWorkerRegister.tsx) so a working "sin conexión" page
// doesn't depend on the user ever opting into push notifications.
//
// Kept as a SEPARATE file from firebase-messaging-sw.js on purpose: a page
// can only have one active service worker per scope, and re-registering the
// *same* script URL with different query params doesn't reliably force an
// update once installed (the browser byte-compares script content, and
// public/ files ignore query strings, so an already-active worker can keep
// running with stale params). Two distinct files sidestep that entirely —
// when push gets enabled, registering firebase-messaging-sw.js (which
// contains this exact same offline logic, see there) cleanly replaces this
// one as the scope's controller, no ambiguity.

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
