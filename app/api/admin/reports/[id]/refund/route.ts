import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || !report.matchId)
    return NextResponse.json({ error: "El reporte no tiene un match/pago asociado" }, { status: 400 });

  const escrowTx = await prisma.transaction.findFirst({
    where: { type: { in: ["ESCROW_HOLD", "ESCROW_RELEASE"] }, meta: { contains: `"matchId":"${report.matchId}"` } },
    orderBy: { createdAt: "desc" },
  });
  if (!escrowTx) return NextResponse.json({ error: "No hay ningún pago para este match" }, { status: 400 });

  const meta = JSON.parse(escrowTx.meta) as { buyerId?: string; sellerId?: string; grossAmount?: number };
  const buyerId = meta.buyerId;
  if (!buyerId) return NextResponse.json({ error: "No se pudo identificar al comprador" }, { status: 400 });

  // Refund the buyer's full original payment, not the seller's post-commission cut.
  const refundAmount = escrowTx.type === "ESCROW_RELEASE" ? (meta.grossAmount ?? escrowTx.amount) : escrowTx.amount;

  if (escrowTx.type === "ESCROW_HOLD" && escrowTx.status === "PENDING") {
    await prisma.transaction.update({ where: { id: escrowTx.id }, data: { status: "REFUNDED" } });
  } else if (escrowTx.type === "ESCROW_RELEASE" && meta.sellerId) {
    // Funds were already released to the seller — claw back what they actually received.
    await prisma.user.update({ where: { id: meta.sellerId }, data: { balance: { decrement: escrowTx.amount } } });
  } else {
    return NextResponse.json({ error: "El pago ya fue reembolsado" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: buyerId }, data: { balance: { increment: refundAmount } } });

  const refundTx = await prisma.transaction.create({
    data: {
      userId: buyerId,
      amount: refundAmount,
      type: "ESCROW_REFUND",
      status: "COMPLETED",
      meta: JSON.stringify({ matchId: report.matchId, reportId: report.id }),
      availableAt: new Date(),
    },
  });

  await prisma.report.update({
    where: { id: report.id },
    data: { status: "RESOLVED", resolution: "Reembolsado al comprador", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await notify(buyerId, "REPORT_RESOLVED", "Te reembolsamos tu pago", `Se te devolvieron $${refundAmount.toFixed(2)} tras revisar tu reporte.`, "/profile");

  return NextResponse.json({ ok: true, refund: refundTx });
}
