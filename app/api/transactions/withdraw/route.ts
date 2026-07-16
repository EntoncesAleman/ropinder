import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// availableAt already marks release + 48h. Withdrawing between that and
// +24h more (i.e. release + 72h) costs a fee; after that it's free.
const FEE_WINDOW_HOURS = 24;
const WITHDRAWAL_FEE_RATE = 0.05;

function feeFreeAt(availableAt: Date) {
  return new Date(availableAt.getTime() + FEE_WINDOW_HOURS * 60 * 60 * 1000);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const matured = await prisma.transaction.findMany({
    where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { lte: now } },
  });
  const pending = await prisma.transaction.findMany({
    where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { gt: now } },
  });

  const withFee = matured.filter((t) => now < feeFreeAt(t.availableAt!));
  const noFee = matured.filter((t) => now >= feeFreeAt(t.availableAt!));
  const withFeeAmount = withFee.reduce((sum, t) => sum + t.amount, 0);
  const noFeeAmount = noFee.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    withdrawable: withFeeAmount + noFeeAmount,
    withdrawableAfterFee: noFeeAmount + withFeeAmount * (1 - WITHDRAWAL_FEE_RATE),
    feeAppliesTo: withFeeAmount,
    feeRate: WITHDRAWAL_FEE_RATE,
    pending: pending.reduce((sum, t) => sum + t.amount, 0),
    pendingUntil: pending.length ? pending.map((t) => t.availableAt).sort()[0] : null,
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const matured = await prisma.transaction.findMany({
    where: { userId: session.id, type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] }, withdrawnAt: null, availableAt: { lte: now } },
  });
  if (matured.length === 0)
    return NextResponse.json({ error: "No tenés fondos disponibles para retirar todavía" }, { status: 400 });

  let gross = 0;
  let fee = 0;
  for (const t of matured) {
    gross += t.amount;
    if (now < feeFreeAt(t.availableAt!)) fee += t.amount * WITHDRAWAL_FEE_RATE;
  }
  const net = gross - fee;

  await prisma.transaction.updateMany({ where: { id: { in: matured.map((t) => t.id) } }, data: { withdrawnAt: now } });
  await prisma.user.update({ where: { id: session.id }, data: { balance: { decrement: gross } } });

  const withdrawal = await prisma.transaction.create({
    data: { userId: session.id, amount: net, type: "WITHDRAWAL", status: "COMPLETED", meta: JSON.stringify({ gross, fee }) },
  });

  return NextResponse.json({ ok: true, amountWithdrawn: net, feeCharged: fee, withdrawal });
}
