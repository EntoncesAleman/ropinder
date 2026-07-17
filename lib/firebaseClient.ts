import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export async function registerPushToken(): Promise<{ ok: boolean; error?: string }> {
  if (!firebaseConfig.apiKey || !firebaseConfig.appId)
    return { ok: false, error: "Las notificaciones push todavía no están configuradas del lado del servidor." };
  if (typeof window === "undefined" || !("serviceWorker" in navigator))
    return { ok: false, error: "Tu navegador no soporta notificaciones push." };
  if (!(await isSupported())) return { ok: false, error: "Tu navegador no soporta notificaciones push." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Necesitamos tu permiso para poder avisarte." };

  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId ?? "",
    messagingSenderId: firebaseConfig.messagingSenderId ?? "",
    appId: firebaseConfig.appId,
  });
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);

  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return { ok: false, error: "No pudimos generar el token de notificaciones." };

  const res = await fetch("/api/push/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform: "web" }),
  });
  if (!res.ok) return { ok: false, error: "No pudimos guardar el token en el servidor." };

  return { ok: true };
}
