import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { transactionId } = await req.json();
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

  if (!tx || tx.status !== "PENDING")
    return NextResponse.json({ error: "Transacción no válida o ya procesada" }, { status: 400 });

  const meta = JSON.parse(tx.meta) as { sellerId?: string; amount?: number };
  if (!meta.sellerId) return NextResponse.json({ error: "Sin vendedor" }, { status: 400 });

  await prisma.user.update({ where: { id: meta.sellerId }, data: { balance: { increment: tx.amount } } });
  await prisma.transaction.update({ where: { id: transactionId }, data: { status: "COMPLETED" } });

  await prisma.transaction.create({
    data: { userId: meta.sellerId, amount: tx.amount, type: "ESCROW_RELEASE", status: "COMPLETED", meta: JSON.stringify({ buyerId: session.id }) },
  });

  return NextResponse.json({ ok: true, amountReleased: tx.amount });
}
