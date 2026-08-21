import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; offerId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id, offerId } = await params;
  const { action } = await req.json();
  if (action !== "accept" && action !== "reject" && action !== "cancel" && action !== "complete")
    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.matchId !== id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (action === "complete") {
    // Closes out an accepted barter — there's no money to escrow/release for
    // a trade, so either side confirming the swap actually happened is what
    // takes both items off the feed and unlocks rating for this match.
    if (!offer.offeredItemId) return NextResponse.json({ error: "Esta oferta no es un canje" }, { status: 400 });
    if (offer.status !== "ACCEPTED") return NextResponse.json({ error: "Esta oferta todavía no fue aceptada" }, { status: 400 });
    if (offer.buyerId !== session.id && offer.sellerId !== session.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    if (offer.completedAt) return NextResponse.json({ error: "Este canje ya fue marcado como completado" }, { status: 400 });

    const now = new Date();
    const [updated] = await Promise.all([
      prisma.offer.update({ where: { id: offerId }, data: { completedAt: now } }),
      prisma.clothingItem.update({ where: { id: offer.itemId }, data: { archived: true, soldAt: now } }),
      prisma.clothingItem.update({ where: { id: offer.offeredItemId }, data: { archived: true, soldAt: now } }),
    ]);

    const otherId = session.id === offer.buyerId ? offer.sellerId : offer.buyerId;
    await notify(otherId, "OFFER", "¡Canje completado!", "Confirmaron que el intercambio se hizo — ya podés calificar.", `/matches/${id}`);

    return NextResponse.json(updated);
  }

  if (offer.status !== "PENDING") return NextResponse.json({ error: "Esta oferta ya fue respondida" }, { status: 400 });

  if (action === "cancel") {
    if (offer.buyerId !== session.id)
      return NextResponse.json({ error: "Solo quien hizo la oferta puede cancelarla" }, { status: 403 });
    const updated = await prisma.offer.update({ where: { id: offerId }, data: { status: "CANCELLED", respondedAt: new Date() } });
    return NextResponse.json(updated);
  }

  if (offer.sellerId !== session.id)
    return NextResponse.json({ error: "Solo el vendedor puede responder esta oferta" }, { status: 403 });

  const status = action === "accept" ? "ACCEPTED" : "REJECTED";
  const updated = await prisma.offer.update({ where: { id: offerId }, data: { status, respondedAt: new Date() } });

  if (status === "ACCEPTED") {
    // Rejecting other pending offers on the same item avoids ambiguity about
    // which accepted price applies when the buyer goes to pay.
    await prisma.offer.updateMany({
      where: { itemId: offer.itemId, matchId: id, status: "PENDING", id: { not: offerId } },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
  }

  await notify(
    offer.buyerId,
    "OFFER",
    status === "ACCEPTED" ? (offer.offeredItemId ? "¡Te aceptaron el canje!" : "¡Tu oferta fue aceptada!") : "Tu propuesta fue rechazada",
    offer.offeredItemId ? "Coordinen la entrega y confirmen el canje desde el chat." : `$${offer.amount}`,
    `/matches/${id}`
  );

  return NextResponse.json(updated);
}
