import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";

  const auctions = await prisma.auction.findMany({
    where: mine
      ? { sellerId: session.id }
      : { status: "ACTIVE", item: { archived: false } },
    include: {
      item: { select: { id: true, title: true, imageUrl: true, brand: true, size: true, condition: true } },
      _count: { select: { bids: true } },
    },
    orderBy: mine ? { createdAt: "desc" } : { endsAt: "asc" },
    take: 60,
  });

  return NextResponse.json(auctions);
}
