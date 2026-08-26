import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { WITHDRAWAL_FEE_RATE, splitByFeeWindow, withdrawableAfterFee, calculateWithdrawal } from "@/lib/withdrawal";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const [matured, pending, feeRate] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { lte: now } },
    }),
    prisma.transaction.findMany({
      where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { gt: now } },
    }),
    getConfigNumber(CONFIG_KEYS.withdrawalFeeRate, WITHDRAWAL_FEE_RATE),
  ]);

  const { withFeeAmount, noFeeAmount } = splitByFeeWindow(matured, now);

  return NextResponse.json({
    withdrawable: withFeeAmount + noFeeAmount,
    withdrawableAfterFee: withdrawableAfterFee(withFeeAmount, noFeeAmount, feeRate),
    feeAppliesTo: withFeeAmount,
    feeRate,
    pending: pending.reduce((sum, t) => sum + t.amount, 0),
    pendingUntil: pending.length ? pending.map((t) => t.availableAt).sort()[0] : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { payoutDestination } = await req.json().catch(() => ({ payoutDestination: undefined }));
  if (!payoutDestination?.trim())
    return NextResponse.json({ error: "Indicá un CBU, alias o cuenta para recibir el pago" }, { status: 400 });

  const now = new Date();
  const [matured, feeRate] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { lte: now } },
    }),
    getConfigNumber(CONFIG_KEYS.withdrawalFeeRate, WITHDRAWAL_FEE_RATE),
  ]);
  if (matured.length === 0)
    return NextResponse.json({ error: "No tenés fondos disponibles para retirar todavía" }, { status: 400 });

  const { gross, fee, net } = calculateWithdrawal(matured, now, feeRate);

  // Reserve the funds immediately (removes them from "withdrawable" and takes
  // them off the user's balance) but the transfer itself needs a human to
  // actually send it — there's no payout rail connected yet. An admin
  // approves (marks COMPLETED once the transfer is sent) or rejects (reverses
  // both of these) from /admin. See the sibling approve/reject routes.
  await prisma.transaction.updateMany({ where: { id: { in: matured.map((t) => t.id) } }, data: { withdrawnAt: now } });
  await prisma.user.update({ where: { id: session.id }, data: { balance: { decrement: gross } } });

  const withdrawal = await prisma.transaction.create({
    data: {
      userId: session.id, amount: net, type: "WITHDRAWAL", status: "PENDING",
      meta: JSON.stringify({ gross, fee, payoutDestination: payoutDestination.trim(), claimedTransactionIds: matured.map((t) => t.id) }),
    },
  });

  return NextResponse.json({ ok: true, pending: true, amountRequested: net, feeCharged: fee, withdrawal });
}
