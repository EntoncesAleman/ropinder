import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (tx.status !== "PENDING") return NextResponse.json({ error: "Esta transacción ya fue procesada" }, { status: 400 });

  const meta = JSON.parse(tx.meta) as {
    paymentMethod?: string; gross?: number; claimedTransactionIds?: string[];
  };

  if (tx.type === "WITHDRAWAL") {
    // Reverse the reservation made when the withdrawal was requested: give
    // the balance back and free up the underlying release/refund
    // transactions so the user can request again.
    await prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: meta.gross ?? tx.amount } } });
    if (meta.claimedTransactionIds?.length) {
      await prisma.transaction.updateMany({ where: { id: { in: meta.claimedTransactionIds } }, data: { withdrawnAt: null } });
    }
  } else if (tx.type !== "CREDIT_PURCHASE" || meta.paymentMethod !== "bank_transfer") {
    return NextResponse.json({ error: "Esta transacción no se puede rechazar" }, { status: 400 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: "REJECTED", meta: JSON.stringify({ ...meta, rejectedBy: admin.email, rejectedAt: new Date().toISOString() }) },
  });

  logAdminAction(admin.id, tx.type === "WITHDRAWAL" ? "WITHDRAWAL_REJECTED" : "BANK_TRANSFER_REJECTED", "Transaction", id, { userId: tx.userId, amount: tx.amount }).catch(() => {});

  return NextResponse.json({ ok: true, transaction: updated });
}
