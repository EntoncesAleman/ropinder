import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/haversine";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@/app/generated/prisma/client";

// Separate from the swipe feed in /api/clothes on purpose: this is an
// intentional search (filters, sort, no "already swiped" exclusion) rather
// than casual proximity-first discovery, so the two shouldn't share logic.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? "";
  const size = searchParams.get("size") ?? "";
  const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
  const canjeOnly = searchParams.get("canjeOnly") === "true";
  const auctionOnly = searchParams.get("auctionOnly") === "true";
  const sortBy = searchParams.get("sortBy") ?? "recent";

  const where: Prisma.ClothingItemWhereInput = {
    userId: { not: session.id },
    archived: false,
    OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }, { category: { contains: q } }] : undefined,
    category: category || undefined,
    size: size || undefined,
    // Auctions carry their own live price on the Auction record, not on
    // ClothingItem.price, so they only ever show up here under auctionOnly.
    listingType: auctionOnly ? "SUBASTA" : { not: "SUBASTA" },
  };
  if (auctionOnly) {
    where.auction = { status: "ACTIVE" };
  } else if (canjeOnly) {
    where.price = null;
  } else if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = { gte: minPrice, lte: maxPrice };
  }

  const orderBy: Prisma.ClothingItemOrderByWithRelationInput[] = auctionOnly
    ? [{ auction: { endsAt: "asc" } }]
    : sortBy === "price_asc" ? [{ price: "asc" }]
    : sortBy === "price_desc" ? [{ price: "desc" }]
    : [{ createdAt: "desc" }];

  const items = await prisma.clothingItem.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true } },
      auction: auctionOnly ? { select: { id: true, currentPrice: true, endsAt: true, _count: { select: { bids: true } } } } : false,
    },
    orderBy,
    take: 60,
  });

  // Same privacy rule as the swipe feed: strip the seller's raw home GPS.
  const withDistance = items.map(({ latitude, longitude, ...item }) => ({
    ...item,
    distance: haversineKm(lat, lng, latitude, longitude),
  }));

  return NextResponse.json(withDistance);
}
