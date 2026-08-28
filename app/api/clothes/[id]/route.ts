import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_VIP_PUBLISH_COST } from "@/lib/vip";

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
  const { latitude, longitude, images, ...safeItem } = item;
  void latitude; void longitude;
  let gallery: string[];
  try { gallery = JSON.parse(images); } catch { gallery = [item.imageUrl]; }
  if (!Array.isArray(gallery) || gallery.length === 0) gallery = [item.imageUrl];

  return NextResponse.json({ ...safeItem, images: gallery, viewCount: item.viewCount + (item.userId !== session.id ? 1 : 0) });
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

  if (action === "publishVip") {
    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== session.id)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (item.isVip) return NextResponse.json({ error: "Ya está publicada como VIP" }, { status: 400 });

    const cost = await getConfigNumber(CONFIG_KEYS.vipPublishCost, DEFAULT_VIP_PUBLISH_COST);

    // Same atomic check-then-spend as bump — no separate cached-credits read.
    const spent = await prisma.user.updateMany({
      where: { id: session.id, credits: { gte: cost } },
      data: { credits: { decrement: cost } },
    });
    if (spent.count === 0) return NextResponse.json({ error: "Sin créditos suficientes" }, { status: 402 });

    await prisma.transaction.create({
      data: { userId: session.id, amount: 0, type: "VIP_PUBLISHED", status: "COMPLETED", meta: JSON.stringify({ itemId: id, cost }) },
    });
    await prisma.clothingItem.update({ where: { id }, data: { isVip: true, vipAt: new Date() } });

    return NextResponse.json({ ok: true, creditsSpent: cost });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}

// Price-only edit (not a full item edit) — the one field change that
// matters enough to notify past likers about (see notify() call below).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { price } = await req.json();
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0)
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });

  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.clothingItem.update({ where: { id }, data: { price } });

  // Only a real drop is worth a notification — a price increase or an
  // unchanged value stays silent.
  if (item.price != null && price < item.price) {
    const likers = await prisma.swipe.findMany({ where: { targetItemId: id, type: "LIKE" }, select: { swiperId: true } });
    await Promise.all(likers.map((l) =>
      notify(l.swiperId, "PRICE_DROP", "Bajó de precio algo que te gustó", `"${item.title}" ahora cuesta $${price} (antes $${item.price}).`, `/item/${id}`)
    ));
  }

  return NextResponse.json({ ok: true, item: updated });
}
