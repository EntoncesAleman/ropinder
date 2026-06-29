import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PACKS = {
  credits_10: { credits: 10, price: 2 },
  credits_30: { credits: 30, price: 5 },
  credits_100: { credits: 100, price: 12 },
  premium_monthly: { credits: 0, price: 9.99, premium: true },
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { packId, paymentMethod } = await req.json();
  const pack = PACKS[packId as keyof typeof PACKS];
  if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 });

  await new Promise((r) => setTimeout(r, 300));

  const updates: Record<string, unknown> = {};
  if (pack.credits > 0) updates.credits = { increment: pack.credits };
  if ("premium" in pack) updates.isPremium = true;

  await prisma.user.update({ where: { id: session.id }, data: updates });

  const tx = await prisma.transaction.create({
    data: {
      userId: session.id,
      amount: pack.price,
      type: "CREDIT_PURCHASE",
      status: "COMPLETED",
      meta: JSON.stringify({ packId, paymentMethod: paymentMethod ?? "card", credits: pack.credits }),
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: session.id },
    select: { credits: true, balance: true, isPremium: true },
  });

  return NextResponse.json({ ok: true, transaction: tx, user: updated });
}
