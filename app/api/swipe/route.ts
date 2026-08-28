import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { findOrCreateMatch } from "@/lib/match";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { clothingItemId, type } = body as { clothingItemId: string; type: "LIKE" | "DISLIKE" };
  const userId = session.id;

  if (!clothingItemId || !type)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // A cached session.credits check followed by a separate decrement later is
  // a check-then-act race: two concurrent LIKEs can both read credits > 0
  // before either write lands, pushing credits negative. Doing the guard and
  // the spend as one conditional update means only one request can ever win.
  if (type === "LIKE") {
    const spent = await prisma.user.updateMany({
      where: { id: userId, OR: [{ isPremium: true }, { credits: { gt: 0 } }] },
      data: { credits: { decrement: 1 } },
    });
    if (spent.count === 0)
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

  if (!ownerLike) return NextResponse.json({ match: false });

  const { matchId } = await findOrCreateMatch(userId, ownerId, "¡Nuevo match!", (name) => `Hiciste match con ${name}`);

  return NextResponse.json({ match: true, matchId, matchedWithUserId: ownerId });
}
