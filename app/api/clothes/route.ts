import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/haversine";
import { getSession } from "@/lib/auth";
import { FREE_LISTING_LIFETIME_DAYS } from "@/lib/limits";
import { STYLES } from "@/lib/catalog";
import { clampRadiusKm, PREMIUM_MAX_RADIUS_KM } from "@/lib/searchRadius";

const VALID_STYLE_IDS = new Set(STYLES.map((s) => s.id));
const DISTANCE_BUCKET_KM = 5;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");
  // Clamped server-side by plan — the client UI already hides radii above
  // what this user's plan allows, but that's not enforcement (see
  // lib/searchRadius.ts).
  const radius = clampRadiusKm(parseFloat(searchParams.get("radius") ?? "10"), session.isPremium);
  // Derived from the session, never trusted from the query string — otherwise
  // any caller could pass another user's id to view their personalized feed
  // and infer that user's swipe history from which items get excluded.
  const userId = session.id;
  const q = searchParams.get("q")?.trim() ?? "";

  const [swipedIds, me] = await Promise.all([
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { targetItemId: true } }).then((rows) => rows.map((s) => s.targetItemId)),
    prisma.user.findUnique({ where: { id: userId }, select: { stylePrefs: true, brandPrefs: true } }),
  ]);
  const myStyles = new Set<string>(JSON.parse(me?.stylePrefs ?? "[]"));
  const myBrands = new Set<string>((JSON.parse(me?.brandPrefs ?? "[]") as string[]).map((b) => b.toLowerCase()));

  const items = await prisma.clothingItem.findMany({
    where: {
      userId: userId ? { not: userId } : undefined,
      id: swipedIds.length > 0 ? { notIn: swipedIds } : undefined,
      archived: false,
      // Auctions aren't "liked into a match" — anyone bids directly from
      // /subastas, so they're surfaced there and in search, not in swipe.
      listingType: { not: "SUBASTA" },
      OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }, { category: { contains: q } }] : undefined,
    },
    include: { user: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true } } },
    orderBy: [{ isBumped: "desc" }, { bumpedAt: "desc" }, { createdAt: "desc" }],
  });

  // Only the computed distance goes to other users — the item's raw lat/lng
  // is the seller's exact home GPS (set from their profile location) and
  // must never leak to someone just browsing the feed.
  const withDistance = items.map(({ latitude, longitude, ...item }) => {
    const affinity = (myStyles.has(item.style) ? 1 : 0) + (myBrands.has(item.brand.toLowerCase()) ? 1 : 0);
    return { ...item, distance: haversineKm(lat, lng, latitude, longitude), affinity };
  });

  // Sponsored (annual Premium) items still respect radius, but always at the widest setting.
  const ads = withDistance.filter((item) => item.isAd && item.distance <= PREMIUM_MAX_RADIUS_KM);
  // Distance still dominates (this is a proximity feed), but within the same
  // ~5km band, items matching the user's style/brand picks from onboarding
  // surface first — a nudge, never a hard filter.
  const nearby = withDistance
    .filter((item) => !item.isAd && item.distance <= radius)
    .sort((a, b) =>
      (b.isBumped ? 1 : 0) - (a.isBumped ? 1 : 0) ||
      Math.floor(a.distance / DISTANCE_BUCKET_KM) - Math.floor(b.distance / DISTANCE_BUCKET_KM) ||
      b.affinity - a.affinity ||
      a.distance - b.distance
    );

  return NextResponse.json([...ads, ...nearby]);
}

const MIN_AUCTION_DURATION_HOURS = 1;
const MAX_AUCTION_DURATION_HOURS = 24 * 14; // 2 weeks

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { title, description, size, brand, condition, category, style, imageUrl, price, listingType, auction } = body;
  if (!title || !size || !brand || !condition || !imageUrl)
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  if (style !== undefined && style !== "" && !VALID_STYLE_IDS.has(style))
    return NextResponse.json({ error: "Estilo inválido" }, { status: 400 });

  const isAuction = listingType === "SUBASTA";
  let auctionConfig: { startingPrice: number; minIncrement: number; durationHours: number } | null = null;
  if (isAuction) {
    const startingPrice = Number(auction?.startingPrice);
    const minIncrement = Number(auction?.minIncrement);
    const durationHours = Number(auction?.durationHours);
    if (!(startingPrice > 0))
      return NextResponse.json({ error: "La subasta necesita un precio inicial válido" }, { status: 400 });
    if (!(minIncrement > 0))
      return NextResponse.json({ error: "La subasta necesita un incremento mínimo válido" }, { status: 400 });
    if (!(durationHours >= MIN_AUCTION_DURATION_HOURS && durationHours <= MAX_AUCTION_DURATION_HOURS))
      return NextResponse.json({ error: `La duración de la subasta debe ser entre ${MIN_AUCTION_DURATION_HOURS}h y ${MAX_AUCTION_DURATION_HOURS / 24} días` }, { status: 400 });
    auctionConfig = { startingPrice, minIncrement, durationHours };
  }

  const item = await prisma.clothingItem.create({
    data: {
      title, description: description ?? "", size, brand, condition,
      category: category ?? "Ropa",
      style: style ?? "",
      imageUrl,
      // Auctions own their price via the Auction record instead.
      price: isAuction ? null : price ? parseFloat(price) : null,
      listingType: isAuction ? "SUBASTA" : "VENTA",
      latitude: session.latitude,
      longitude: session.longitude,
      userId: session.id,
      // Premium listings stay up indefinitely; free ones expire and move to history.
      expiresAt: session.isPremium ? null : new Date(Date.now() + FREE_LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  if (auctionConfig) {
    const now = new Date();
    await prisma.auction.create({
      data: {
        itemId: item.id,
        sellerId: session.id,
        startingPrice: auctionConfig.startingPrice,
        minIncrement: auctionConfig.minIncrement,
        currentPrice: auctionConfig.startingPrice,
        startsAt: now,
        endsAt: new Date(now.getTime() + auctionConfig.durationHours * 60 * 60 * 1000),
        status: "ACTIVE",
      },
    });
  }

  await prisma.user.update({ where: { id: session.id }, data: { credits: { increment: 2 } } });
  await prisma.transaction.create({
    data: { userId: session.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "+2 créditos por publicar prenda", itemId: item.id }) },
  });

  return NextResponse.json({ item, creditsEarned: 2 }, { status: 201 });
}
