import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/haversine";
import { getSession } from "@/lib/auth";
import { FREE_LISTING_LIFETIME_DAYS } from "@/lib/limits";

// Matches the largest option on the client's DistanceSlider — ads still
// respect radius, just always at the widest one available.
const MAX_RADIUS_KM = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");
  const radius = parseFloat(searchParams.get("radius") ?? "10");
  const userId = searchParams.get("userId") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  const swipedIds = userId
    ? (await prisma.swipe.findMany({ where: { swiperId: userId }, select: { targetItemId: true } })).map((s) => s.targetItemId)
    : [];

  const items = await prisma.clothingItem.findMany({
    where: {
      userId: userId ? { not: userId } : undefined,
      id: swipedIds.length > 0 ? { notIn: swipedIds } : undefined,
      archived: false,
      OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }, { category: { contains: q } }] : undefined,
    },
    include: { user: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true } } },
    orderBy: [{ isBumped: "desc" }, { bumpedAt: "desc" }, { createdAt: "desc" }],
  });

  const withDistance = items.map((item) => ({ ...item, distance: haversineKm(lat, lng, item.latitude, item.longitude) }));

  // Sponsored (annual Premium) items still respect radius, but always at the widest setting.
  const ads = withDistance.filter((item) => item.isAd && item.distance <= MAX_RADIUS_KM);
  const nearby = withDistance
    .filter((item) => !item.isAd && item.distance <= radius)
    .sort((a, b) => (b.isBumped ? 1 : 0) - (a.isBumped ? 1 : 0) || a.distance - b.distance);

  return NextResponse.json([...ads, ...nearby]);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const { title, description, size, brand, condition, category, imageUrl, price } = body;
    if (!title || !size || !brand || !condition || !imageUrl)
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });

    const item = await prisma.clothingItem.create({
      data: {
        title, description: description ?? "", size, brand, condition,
        category: category ?? "Ropa",
        imageUrl,
        price: price ? parseFloat(price) : null,
        latitude: session.latitude,
        longitude: session.longitude,
        userId: session.id,
        // Premium listings stay up indefinitely; free ones expire and move to history.
        expiresAt: session.isPremium ? null : new Date(Date.now() + FREE_LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({ where: { id: session.id }, data: { credits: { increment: 2 } } });
    await prisma.transaction.create({
      data: { userId: session.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "+2 créditos por publicar prenda", itemId: item.id }) },
    });

    return NextResponse.json({ item, creditsEarned: 2 }, { status: 201 });
  } catch (err) {
    console.error("Create clothing item error:", err);
    return NextResponse.json({ error: "Error publicando la prenda" }, { status: 500 });
  }
}
