import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PACKS, PackId } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { packId, paymentMethod } = await req.json();
  const pack = PACKS[packId as PackId];
  if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 });

  await new Promise((r) => setTimeout(r, 300));

  const updates: Record<string, unknown> = {};
  if (pack.credits > 0) updates.credits = { increment: pack.credits };
  if ("verified" in pack && pack.verified) { updates.verified = true; updates.verifiedAt = new Date(); }

  if ("premium" in pack && pack.premium) {
    const current = await prisma.user.findUnique({ where: { id: session.id }, select: { premiumUntil: true, isPremium: true } });
    const base = current?.isPremium && current.premiumUntil && current.premiumUntil > new Date() ? current.premiumUntil : new Date();
    updates.isPremium = true;
    updates.premiumUntil = new Date(base.getTime() + pack.days * 24 * 60 * 60 * 1000);
  }

  await prisma.user.update({ where: { id: session.id }, data: updates });

  const tx = await prisma.transaction.create({
    data: {
      userId: session.id,
      amount: pack.price,
      type: "CREDIT_PURCHASE",
      status: "COMPLETED",
      meta: JSON.stringify({ packId, paymentMethod: paymentMethod ?? "card", credits: pack.credits, currency: pack.currency }),
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: session.id },
    select: { credits: true, balance: true, isPremium: true, premiumUntil: true, verified: true },
  });

  return NextResponse.json({ ok: true, transaction: tx, user: updated });
}
