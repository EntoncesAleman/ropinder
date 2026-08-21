import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";

// No money ever moves for a bid in this model (see AUDIT.md — bidding is a
// commitment record, not an escrow hold), so cancelling never needs a refund
// path — it just stops the auction from accepting further bids or a winner.
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (auction.status === "ENDED" || auction.status === "CANCELLED")
    return NextResponse.json({ error: "Esta subasta ya está cerrada" }, { status: 400 });

  const updated = await prisma.auction.update({ where: { id }, data: { status: "CANCELLED" } });
  await notify(auction.sellerId, "AUCTION_ENDED", "Tu subasta fue cancelada por el equipo de Ropinder", "", `/subastas/${id}`);

  return NextResponse.json({ ok: true, auction: updated });
}
