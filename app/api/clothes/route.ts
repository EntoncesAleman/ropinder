import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/haversine";
import { getSession } from "@/lib/auth";

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
      OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }, { category: { contains: q } }] : undefined,
    },
    include: { user: { select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true } } },
    orderBy: [{ isBumped: "desc" }, { bumpedAt: "desc" }, { createdAt: "desc" }],
  });

  const nearby = items
    .map((item) => ({ ...item, distance: haversineKm(lat, lng, item.latitude, item.longitude) }))
    .filter((item) => item.distance <= radius)
    .sort((a, b) => (b.isBumped ? 1 : 0) - (a.isBumped ? 1 : 0) || a.distance - b.distance);

  return NextResponse.json(nearby);
}

export async function POST(req: NextRequest) {
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
    },
  });

  await prisma.user.update({ where: { id: session.id }, data: { credits: { increment: 2 } } });
  await prisma.transaction.create({
    data: { userId: session.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "+2 créditos por publicar prenda", itemId: item.id }) },
  });

  return NextResponse.json({ item, creditsEarned: 2 }, { status: 201 });
}
