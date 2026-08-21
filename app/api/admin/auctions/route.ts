import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const auctions = await prisma.auction.findMany({
    include: {
      item: { select: { id: true, title: true, imageUrl: true } },
      seller: { select: { id: true, name: true, email: true } },
      winner: { select: { id: true, name: true, email: true } },
      _count: { select: { bids: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(auctions);
}
