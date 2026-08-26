import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { applyPackToUser } from "@/lib/applyPack";
import { PackId } from "@/lib/pricing";
import { getFinancialProvider } from "@/lib/financialProvider";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (tx.status !== "PENDING") return NextResponse.json({ error: "Esta transacción ya fue procesada" }, { status: 400 });

  const meta = JSON.parse(tx.meta) as { packId?: string; paymentMethod?: string; payoutDestination?: string };

  // A withdrawal has no pack to grant — the funds were already reserved when
  // the user requested it. Routed through the provider adapter (mock today)
  // so this "approve" click maps to a real payout() call with its own
  // providerRef, not just a status flip — the admin still has to actually
  // send the transfer by hand until a real payout rail is connected.
  if (tx.type === "WITHDRAWAL") {
    const payout = await getFinancialProvider().payout({
      userId: tx.userId, amount: tx.amount, destination: meta.payoutDestination ?? "",
    });
    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: "COMPLETED", meta: JSON.stringify({ ...meta, approvedBy: admin.email, approvedAt: new Date().toISOString(), providerRef: payout.providerRef }) },
    });
    return NextResponse.json({ ok: true, transaction: updated });
  }

  if (tx.type !== "CREDIT_PURCHASE" || meta.paymentMethod !== "bank_transfer" || !meta.packId)
    return NextResponse.json({ error: "Esta transacción no es una transferencia ni un retiro pendiente de aprobar" }, { status: 400 });

  await applyPackToUser(tx.userId, meta.packId as PackId);
  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: "COMPLETED", meta: JSON.stringify({ ...meta, approvedBy: admin.email, approvedAt: new Date().toISOString() }) },
  });

  return NextResponse.json({ ok: true, transaction: updated });
}
