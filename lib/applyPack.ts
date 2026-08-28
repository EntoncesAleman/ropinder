import { prisma } from "./prisma";
import { PACKS, PackId } from "./pricing";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Applies a pack's benefits (credits / premium / verified badge) to a user.
// Shared by the instant "card" checkout and the admin's manual approval of a
// pending bank-transfer purchase, so both paths stay in sync.
export async function applyPackToUser(userId: string, packId: PackId) {
  const pack = PACKS[packId];
  const updates: Record<string, unknown> = {};
  if (pack.credits > 0) updates.credits = { increment: pack.credits };

  const needsCurrent = ("premium" in pack && pack.premium) || ("verified" in pack && pack.verified);
  const current = needsCurrent
    ? await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true, isPremium: true, verified: true, verifiedUntil: true } })
    : null;

  if ("verified" in pack && pack.verified) {
    // Same stacking rule as premium: renewing early adds a year on top of
    // the current expiry instead of resetting the clock to today.
    const base = current?.verified && current.verifiedUntil && current.verifiedUntil > new Date() ? current.verifiedUntil : new Date();
    updates.verified = true;
    updates.verifiedAt = new Date();
    updates.verifiedUntil = new Date(base.getTime() + ONE_YEAR_MS);
  }

  if ("premium" in pack && pack.premium) {
    const base = current?.isPremium && current.premiumUntil && current.premiumUntil > new Date() ? current.premiumUntil : new Date();
    updates.isPremium = true;
    updates.premiumUntil = new Date(base.getTime() + pack.days * 24 * 60 * 60 * 1000);
    updates.premiumPlan = packId;
  }

  await prisma.user.update({ where: { id: userId }, data: updates });
}
