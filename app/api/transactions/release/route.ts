import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const WITHDRAWAL_HOLD_HOURS = 48;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { transactionId, matchId } = await req.json();

  const tx = transactionId
    ? await prisma.transaction.findUnique({ where: { id: transactionId } })
    : await prisma.transaction.findFirst({
        where: { type: "ESCROW_HOLD", status: "PENDING", meta: { contains: `"matchId":"${matchId}"` } },
      });

  if (!tx || tx.status !== "PENDING" || tx.type !== "ESCROW_HOLD")
    return NextResponse.json({ error: "No hay ningún pago pendiente para liberar" }, { status: 400 });

  const meta = JSON.parse(tx.meta) as { sellerId?: string; buyerId?: string; matchId?: string };
  if (!meta.sellerId) return NextResponse.json({ error: "Sin vendedor" }, { status: 400 });

  // Only the buyer who funded the escrow can confirm receipt and release it.
  if (meta.buyerId !== session.id)
    return NextResponse.json({ error: "Solo quien pagó puede confirmar la recepción" }, { status: 403 });

  const availableAt = new Date(Date.now() + WITHDRAWAL_HOLD_HOURS * 60 * 60 * 1000);

  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "COMPLETED" } });

  await prisma.user.update({ where: { id: meta.sellerId }, data: { balance: { increment: tx.amount } } });

  await prisma.transaction.create({
    data: {
      userId: meta.sellerId,
      amount: tx.amount,
      type: "ESCROW_RELEASE",
      status: "COMPLETED",
      meta: JSON.stringify({ buyerId: session.id, sellerId: meta.sellerId, matchId: meta.matchId }),
      availableAt,
    },
  });

  return NextResponse.json({ ok: true, amountReleased: tx.amount, withdrawableAt: availableAt });
}
