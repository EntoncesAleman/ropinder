"use client";
import { useEffect } from "react";

// Registers only the offline-shell worker unconditionally. Push stays a
// separate opt-in registration (lib/firebaseClient.ts registerPushToken())
// that replaces this one as the scope's controller once enabled — see
// public/sw-offline.js for why these are two files instead of one.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-offline.js").catch(() => {});
    }
  }, []);
  return null;
}
