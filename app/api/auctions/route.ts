import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { closeExpiredAuction } from "@/lib/closeAuction";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";

  // Close anything overdue before listing, so "active" never shows something
  // that's actually past endsAt — see lib/closeAuction.ts for why this can't
  // rely on the cron alone.
  const overdue = await prisma.auction.findMany({ where: { status: "ACTIVE", endsAt: { lte: new Date() } }, select: { id: true } });
  for (const { id } of overdue) await closeExpiredAuction(id);

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
