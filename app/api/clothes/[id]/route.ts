import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const BUMP_COST = 3;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true, verified: true, lastSeenAt: true, bannedAt: true } },
      auction: { select: { id: true } },
    },
  });
  if (!item || item.archived || item.user.bannedAt)
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Don't inflate the count when the owner views their own listing.
  if (item.userId !== session.id) {
    prisma.clothingItem.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  // Same rule as the feed: never leak the seller's raw home GPS.
  const { latitude, longitude, ...safeItem } = item;
  void latitude; void longitude;
  return NextResponse.json({ ...safeItem, viewCount: item.viewCount + (item.userId !== session.id ? 1 : 0) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (action === "bump") {
    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== session.id)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Same check-then-act race as swipe: guard and spend must be one atomic
    // conditional update, not a cached-session check followed by a decrement.
    if (!session.isPremium) {
      const spent = await prisma.user.updateMany({
        where: { id: session.id, credits: { gte: BUMP_COST } },
        data: { credits: { decrement: BUMP_COST } },
      });
      if (spent.count === 0)
        return NextResponse.json({ error: "Sin créditos suficientes" }, { status: 402 });
      await prisma.transaction.create({
        data: { userId: session.id, amount: 0, type: "PREMIUM_BUMP", status: "COMPLETED", meta: JSON.stringify({ itemId: id, cost: BUMP_COST }) },
      });
    }

    await prisma.clothingItem.update({ where: { id }, data: { isBumped: true, bumpedAt: new Date() } });
    return NextResponse.json({ ok: true, creditsSpent: session.isPremium ? 0 : BUMP_COST });
  }

  if (action === "toggleAd") {
    if (session.premiumPlan !== "premium_yearly" || !session.isPremium)
      return NextResponse.json({ error: "Solo disponible con el plan Premium anual" }, { status: 403 });

    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== session.id)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const updated = await prisma.clothingItem.update({ where: { id }, data: { isAd: !item.isAd } });
    return NextResponse.json({ ok: true, isAd: updated.isAd });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
