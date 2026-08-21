import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { closeExpiredAuction } from "@/lib/closeAuction";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  await closeExpiredAuction(id); // no-op unless this one is overdue — see lib/closeAuction.ts
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      item: { select: { id: true, title: true, description: true, imageUrl: true, brand: true, size: true, condition: true, userId: true } },
      seller: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true, verified: true } },
      winner: { select: { id: true, name: true, avatar: true } },
      bids: { orderBy: { amount: "desc" }, take: 20, include: { bidder: { select: { id: true, name: true, avatar: true } } } },
    },
  });
  if (!auction) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const escrowTx = await prisma.transaction.findFirst({
    where: { type: { in: ["ESCROW_HOLD", "ESCROW_RELEASE"] }, meta: { contains: `"auctionId":"${id}"` } },
    orderBy: { createdAt: "desc" },
  });
  const escrow = escrowTx
    ? { id: escrowTx.id, amount: escrowTx.amount, type: escrowTx.type, status: escrowTx.status, meta: JSON.parse(escrowTx.meta) as { buyerId?: string; sellerId?: string } }
    : null;

  return NextResponse.json({ ...auction, escrow });
}
