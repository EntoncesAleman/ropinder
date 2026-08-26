import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM, resolveCommissionRate, splitGrossCommission } from "@/lib/commission";

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

  const meta = JSON.parse(tx.meta) as { sellerId?: string; buyerId?: string; matchId?: string; itemId?: string | null };
  if (!meta.sellerId) return NextResponse.json({ error: "Sin vendedor" }, { status: 400 });

  // Only the buyer who funded the escrow can confirm receipt and release it.
  if (meta.buyerId !== session.id)
    return NextResponse.json({ error: "Solo quien pagó puede confirmar la recepción" }, { status: 403 });

  const [seller, standardRate, premiumRate] = await Promise.all([
    prisma.user.findUnique({ where: { id: meta.sellerId }, select: { isPremium: true } }),
    getConfigNumber(CONFIG_KEYS.commissionStandard, DEFAULT_COMMISSION_STANDARD),
    getConfigNumber(CONFIG_KEYS.commissionPremium, DEFAULT_COMMISSION_PREMIUM),
  ]);
  const commissionRate = resolveCommissionRate(!!seller?.isPremium, standardRate, premiumRate);

  const availableAt = new Date(Date.now() + WITHDRAWAL_HOLD_HOURS * 60 * 60 * 1000);
  const { commission, netAmount } = splitGrossCommission(tx.amount, commissionRate);

  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "COMPLETED" } });

  await prisma.user.update({ where: { id: meta.sellerId }, data: { balance: { increment: netAmount } } });

  // Sold items come off the feed automatically; they stay visible in each side's own history.
  if (meta.itemId) {
    await prisma.clothingItem.update({ where: { id: meta.itemId }, data: { archived: true, soldAt: new Date() } });
  }

  await prisma.transaction.create({
    data: {
      userId: meta.sellerId,
      amount: netAmount,
      type: "ESCROW_RELEASE",
      status: "COMPLETED",
      meta: JSON.stringify({
        buyerId: session.id, sellerId: meta.sellerId, matchId: meta.matchId,
        grossAmount: tx.amount, commission, commissionRate,
      }),
      availableAt,
    },
  });

  return NextResponse.json({ ok: true, amountReleased: netAmount, commission, withdrawableAt: availableAt });
}
