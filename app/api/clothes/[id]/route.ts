import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const BUMP_COST = 3;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (action === "bump") {
    if (session.credits < BUMP_COST && !session.isPremium)
      return NextResponse.json({ error: "Sin créditos suficientes" }, { status: 402 });

    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== session.id)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.clothingItem.update({ where: { id }, data: { isBumped: true, bumpedAt: new Date() } });
    if (!session.isPremium) {
      await prisma.user.update({ where: { id: session.id }, data: { credits: { decrement: BUMP_COST } } });
      await prisma.transaction.create({
        data: { userId: session.id, amount: 0, type: "PREMIUM_BUMP", status: "COMPLETED", meta: JSON.stringify({ itemId: id, cost: BUMP_COST }) },
      });
    }
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
