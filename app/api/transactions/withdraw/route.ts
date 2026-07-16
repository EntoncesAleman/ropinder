import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const matured = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] },
      withdrawnAt: null,
      availableAt: { lte: now },
    },
  });
  const pending = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] },
      withdrawnAt: null,
      availableAt: { gt: now },
    },
  });

  return NextResponse.json({
    withdrawable: matured.reduce((sum, t) => sum + t.amount, 0),
    pending: pending.reduce((sum, t) => sum + t.amount, 0),
    pendingUntil: pending.length ? pending.map((t) => t.availableAt).sort()[0] : null,
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const now = new Date();
  const matured = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      type: { in: ["ESCROW_RELEASE", "ESCROW_REFUND"] },
      withdrawnAt: null,
      availableAt: { lte: now },
    },
  });

  const amount = matured.reduce((sum, t) => sum + t.amount, 0);
  if (amount <= 0) return NextResponse.json({ error: "No tenés fondos disponibles para retirar todavía" }, { status: 400 });

  await prisma.transaction.updateMany({
    where: { id: { in: matured.map((t) => t.id) } },
    data: { withdrawnAt: now },
  });

  await prisma.user.update({ where: { id: session.id }, data: { balance: { decrement: amount } } });

  const withdrawal = await prisma.transaction.create({
    data: { userId: session.id, amount, type: "WITHDRAWAL", status: "COMPLETED", meta: "{}" },
  });

  return NextResponse.json({ ok: true, amountWithdrawn: amount, withdrawal });
}
