import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFinancialProvider } from "@/lib/financialProvider";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { itemId, delivery } = body;
  if (!itemId) return NextResponse.json({ error: "Falta la prenda" }, { status: 400 });
  let amount: number;

  // Delivery is informational only right now — there's no courier account
  // connected yet, so "shipping" just records where to send it; actually
  // booking/tracking a real shipment is not implemented.
  let deliveryInfo: { type: "meetup" | "shipping"; fullName?: string; address?: string } = { type: "meetup" };
  if (delivery?.type === "shipping") {
    const fullName = String(delivery.fullName ?? "").trim();
    const address = String(delivery.address ?? "").trim();
    if (!fullName || !address)
      return NextResponse.json({ error: "Para envío necesitamos nombre completo y dirección" }, { status: 400 });
    deliveryInfo = { type: "shipping", fullName, address };
  }

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await prisma.transaction.findFirst({
    where: { type: "ESCROW_HOLD", status: "PENDING", meta: { contains: `"matchId":"${id}"` } },
  });
  if (existing) return NextResponse.json({ error: "Ya hay un pago en custodia para este match" }, { status: 400 });

  const sellerId = match.userAId === session.id ? match.userBId : match.userAId;

  // The source of truth is always either an offer the seller explicitly
  // accepted, or the item's own listed price — never a client-supplied
  // amount, or a buyer could "pay" a fabricated amount into escrow (there's
  // no real card charge yet) and have it released as a real balance to the
  // seller. itemId is required above specifically so this branch can never
  // be skipped.
  const item = await prisma.clothingItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== sellerId || item.archived)
    return NextResponse.json({ error: "Esa prenda ya no está disponible" }, { status: 400 });

  const acceptedOffer = await prisma.offer.findFirst({
    where: { matchId: id, itemId, buyerId: session.id, status: "ACCEPTED" },
    orderBy: { respondedAt: "desc" },
  });

  if (acceptedOffer) {
    amount = acceptedOffer.amount;
  } else {
    if (typeof item.price !== "number" || item.price <= 0)
      return NextResponse.json({ error: "Esa prenda no tiene un precio configurado" }, { status: 400 });
    amount = item.price;
  }

  // Goes through the provider adapter (mock today, see lib/financialProvider.ts)
  // instead of a bare fake delay — the charge is a real event with a
  // providerRef, even though no actual money moves yet. Ropinder holds the
  // funds in escrow until receipt is confirmed.
  const charge = await getFinancialProvider().charge({ userId: session.id, amount, meta: { matchId: id, itemId: itemId ?? null } });
  if (charge.status !== "COMPLETED")
    return NextResponse.json({ error: "No se pudo procesar el pago" }, { status: 402 });

  const tx = await prisma.transaction.create({
    data: {
      userId: session.id,
      amount,
      type: "ESCROW_HOLD",
      status: "PENDING",
      meta: JSON.stringify({ matchId: id, buyerId: session.id, sellerId, itemId: itemId ?? null, delivery: deliveryInfo, providerRef: charge.providerRef }),
    },
  });

  return NextResponse.json(tx, { status: 201 });
}
