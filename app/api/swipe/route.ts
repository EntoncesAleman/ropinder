import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, clothingItemId, type } = body as { userId: string; clothingItemId: string; type: "LIKE" | "DISLIKE" };

  if (!userId || !clothingItemId || !type)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (type === "LIKE") {
    const swiper = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true, isPremium: true } });
    if (swiper && swiper.credits <= 0 && !swiper.isPremium)
      return NextResponse.json({ error: "Sin créditos", code: "NO_CREDITS" }, { status: 402 });
  }

  await prisma.swipe.upsert({
    where: { swiperId_targetItemId: { swiperId: userId, targetItemId: clothingItemId } },
    create: { swiperId: userId, targetItemId: clothingItemId, type },
    update: { type },
  });

  if (type !== "LIKE") return NextResponse.json({ match: false });

  const targetItem = await prisma.clothingItem.findUnique({ where: { id: clothingItemId }, select: { userId: true } });
  if (!targetItem) return NextResponse.json({ match: false });
  const ownerId = targetItem.userId;

  const currentUserItems = await prisma.clothingItem.findMany({ where: { userId }, select: { id: true } });
  if (!currentUserItems.length) return NextResponse.json({ match: false });

  const ownerLike = await prisma.swipe.findFirst({
    where: { swiperId: ownerId, targetItemId: { in: currentUserItems.map((i) => i.id) }, type: "LIKE" },
  });

  if (!ownerLike) {
    await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });
    return NextResponse.json({ match: false });
  }

  const existing = await prisma.match.findFirst({
    where: { OR: [{ userAId: userId, userBId: ownerId }, { userAId: ownerId, userBId: userId }] },
  });

  let matchId = existing?.id;
  if (!existing) {
    const match = await prisma.match.create({ data: { userAId: userId, userBId: ownerId } });
    matchId = match.id;
  }

  await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } });

  return NextResponse.json({ match: true, matchId, matchedWithUserId: ownerId });
}
