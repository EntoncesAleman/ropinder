import { prisma } from "./prisma";
import { PACKS, PackId } from "./pricing";

// Applies a pack's benefits (credits / premium / verified badge) to a user.
// Shared by the instant "card" checkout and the admin's manual approval of a
// pending bank-transfer purchase, so both paths stay in sync.
export async function applyPackToUser(userId: string, packId: PackId) {
  const pack = PACKS[packId];
  const updates: Record<string, unknown> = {};
  if (pack.credits > 0) updates.credits = { increment: pack.credits };
  if ("verified" in pack && pack.verified) { updates.verified = true; updates.verifiedAt = new Date(); }

  if ("premium" in pack && pack.premium) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true, isPremium: true } });
    const base = current?.isPremium && current.premiumUntil && current.premiumUntil > new Date() ? current.premiumUntil : new Date();
    updates.isPremium = true;
    updates.premiumUntil = new Date(base.getTime() + pack.days * 24 * 60 * 60 * 1000);
    updates.premiumPlan = packId;
  }

  await prisma.user.update({ where: { id: userId }, data: updates });
}
