import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_VIP_UNLOCK_COST } from "@/lib/vip";
import { findOrCreateMatch } from "@/lib/match";

// Unlocking a VIP item pays credits and creates the Match directly, instead
// of requiring the seller to have swiped one of the buyer's items first —
// that's the whole point of VIP (see lib/vip.ts).
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || item.archived) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!item.isVip) return NextResponse.json({ error: "Esta prenda no es VIP" }, { status: 400 });
  if (item.userId === session.id) return NextResponse.json({ error: "Es tu propia prenda" }, { status: 400 });

  const cost = await getConfigNumber(CONFIG_KEYS.vipUnlockCost, DEFAULT_VIP_UNLOCK_COST);

  const spent = await prisma.user.updateMany({
    where: { id: session.id, credits: { gte: cost } },
    data: { credits: { decrement: cost } },
  });
  if (spent.count === 0) return NextResponse.json({ error: "Sin créditos suficientes", code: "NO_CREDITS" }, { status: 402 });

  await prisma.transaction.create({
    data: { userId: session.id, amount: 0, type: "VIP_UNLOCKED", status: "COMPLETED", meta: JSON.stringify({ itemId: id, cost }) },
  });

  const { matchId } = await findOrCreateMatch(
    session.id, item.userId,
    "Alguien desbloqueó tu prenda VIP",
    (name) => `${name} pagó para acceder directo a tu prenda — ya pueden chatear.`
  );

  return NextResponse.json({ ok: true, matchId, creditsSpent: cost });
}
