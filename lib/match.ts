import { prisma } from "./prisma";
import { notify } from "./notify";

// Finds the existing Match between two users, or creates one and notifies
// the other party. Shared by swipe (mutual-like path) and VIP unlock (paid
// bypass path, see lib/vip.ts) — both lead into the same
// chat/pay/escrow machinery once a Match exists.
export async function findOrCreateMatch(
  userId: string,
  otherUserId: string,
  notifyTitle: string,
  notifyBody: (name: string) => string
): Promise<{ matchId: string; created: boolean }> {
  const existing = await prisma.match.findFirst({
    where: { OR: [{ userAId: userId, userBId: otherUserId }, { userAId: otherUserId, userBId: userId }] },
  });
  if (existing) return { matchId: existing.id, created: false };

  const match = await prisma.match.create({ data: { userAId: userId, userBId: otherUserId } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(otherUserId, "MATCH", notifyTitle, notifyBody(user?.name ?? "alguien"), `/matches/${match.id}`);
  return { matchId: match.id, created: true };
}
