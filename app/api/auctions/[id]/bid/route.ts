import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { validateBid } from "@/lib/auction";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { amount } = await req.json();
  if (typeof amount !== "number")
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const validationError = validateBid(auction, session.id, amount, new Date());
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  // Optimistic concurrency: this only succeeds if currentPrice is still
  // exactly what we just read above. Two simultaneous bids can't both win —
  // whichever request's updateMany lands first flips currentPrice, so the
  // other's WHERE no longer matches and it gets count:0 instead of a phantom win.
  const result = await prisma.auction.updateMany({
    where: { id, currentPrice: auction.currentPrice, status: "ACTIVE" },
    data: { currentPrice: amount },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Alguien pujó justo antes que vos — refrescá para ver el precio actual" }, { status: 409 });

  const [bid, item] = await Promise.all([
    prisma.bid.create({ data: { auctionId: id, bidderId: session.id, amount } }),
    prisma.clothingItem.findUnique({ where: { id: auction.itemId }, select: { title: true } }),
  ]);

  await notify(auction.sellerId, "BID", "Nueva puja en tu subasta", `$${amount} por "${item?.title ?? "tu prenda"}"`, `/subastas/${id}`);

  const previousTopBid = await prisma.bid.findFirst({
    where: { auctionId: id, bidderId: { not: session.id } },
    orderBy: { amount: "desc" },
  });
  if (previousTopBid) {
    await notify(previousTopBid.bidderId, "BID", "Te superaron la puja", `Nueva puja de $${amount}`, `/subastas/${id}`);
  }

  return NextResponse.json({ ok: true, bid, currentPrice: amount }, { status: 201 });
}
