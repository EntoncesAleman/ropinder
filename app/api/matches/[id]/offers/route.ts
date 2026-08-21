import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const offers = await prisma.offer.findMany({ where: { matchId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(offers);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { itemId, amount, offeredItemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "Oferta inválida" }, { status: 400 });

  // Two kinds of offer on the same item: pay a money amount, or propose a
  // barter (trade one of my own items for it). Exactly one of the two.
  const isTrade = typeof offeredItemId === "string" && offeredItemId.length > 0;
  if (!isTrade && (typeof amount !== "number" || amount <= 0))
    return NextResponse.json({ error: "Oferta inválida" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const sellerId = match.userAId === session.id ? match.userBId : match.userAId;

  const item = await prisma.clothingItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== sellerId || item.archived)
    return NextResponse.json({ error: "Esa prenda ya no está disponible" }, { status: 400 });

  let offeredItem = null;
  if (isTrade) {
    offeredItem = await prisma.clothingItem.findUnique({ where: { id: offeredItemId } });
    if (!offeredItem || offeredItem.userId !== session.id || offeredItem.archived)
      return NextResponse.json({ error: "Elegí una prenda tuya disponible para el canje" }, { status: 400 });
  } else if (typeof item.price !== "number" || item.price <= 0) {
    return NextResponse.json({ error: "Esa prenda no tiene un precio configurado" }, { status: 400 });
  }

  const pending = await prisma.offer.findFirst({
    where: { matchId: id, itemId, buyerId: session.id, status: "PENDING" },
  });
  if (pending) return NextResponse.json({ error: "Ya tenés una oferta pendiente para esta prenda" }, { status: 400 });

  const alreadyPaying = await prisma.transaction.findFirst({
    where: { type: "ESCROW_HOLD", status: "PENDING", meta: { contains: `"matchId":"${id}"` } },
  });
  if (alreadyPaying) return NextResponse.json({ error: "Ya hay un pago en custodia para este match" }, { status: 400 });

  const offer = await prisma.offer.create({
    data: { matchId: id, itemId, buyerId: session.id, sellerId, amount: isTrade ? 0 : amount, offeredItemId: isTrade ? offeredItemId : null },
  });

  const notifBody = isTrade ? `"${offeredItem!.title}" por "${item.title}"` : `$${amount} por "${item.title}"`;
  await notify(sellerId, "OFFER", isTrade ? "Te proponen un canje" : "Te hicieron una oferta", notifBody, `/matches/${id}`);

  return NextResponse.json(offer, { status: 201 });
}
