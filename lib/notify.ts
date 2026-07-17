import { prisma } from "./prisma";
import { sendPush } from "./push";

export async function notify(userId: string, type: string, title: string, body = "", link = "") {
  const notification = await prisma.notification.create({ data: { userId, type, title, body, link } });
  sendPush(userId, title, body, link).catch((e) => console.error("PUSH_SEND_ERROR", e));
  return notification;
}
