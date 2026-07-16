import { prisma } from "./prisma";

export async function notify(userId: string, type: string, title: string, body = "", link = "") {
  return prisma.notification.create({ data: { userId, type, title, body, link } });
}
