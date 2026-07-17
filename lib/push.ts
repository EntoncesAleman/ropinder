import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "./prisma";

let cachedApp: App | null | undefined;

function getFirebaseAdminApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    cachedApp = null;
    return cachedApp;
  }

  cachedApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
  return cachedApp;
}

// Best-effort push send — the in-app notification (see notify() in lib/notify.ts)
// is the source of truth; this is a no-op until Firebase server credentials are set.
export async function sendPush(userId: string, title: string, body: string, link = "") {
  const app = getFirebaseAdminApp();
  if (!app) return;

  const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { id: true, token: true } });
  if (tokens.length === 0) return;

  const response = await getMessaging(app).sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title, body },
    data: { link },
    webpush: { fcmOptions: { link: link || "/" } },
  });

  const deadTokenIds = response.responses
    .map((r, i) => (!r.success && r.error?.code === "messaging/registration-token-not-registered" ? tokens[i].id : null))
    .filter((id): id is string => id !== null);
  if (deadTokenIds.length > 0) await prisma.pushToken.deleteMany({ where: { id: { in: deadTokenIds } } });
}
