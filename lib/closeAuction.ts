import { prisma } from "./prisma";
import { notify } from "./notify";

// Vercel Hobby limits cron to once a day (see vercel.json), which is far too
// coarse for auctions that can last as little as 6 hours — a winner might
// not get their item/escrow for up to 24h otherwise. So closing isn't
// cron-only: any request that touches an expired-but-still-ACTIVE auction
// (viewing it, listing it, bidding on it) closes it right then too — same
// "lazy expiry on read" pattern lib/auth.ts already uses for premium.
// The atomic ACTIVE->ENDED guard means it's safe to call this from several
// places without double-closing the same auction.
export async function closeExpiredAuction(auctionId: string): Promise<void> {
  const now = new Date();
  const claimed = await prisma.auction.updateMany({
    where: { id: auctionId, status: "ACTIVE", endsAt: { lte: now } },
    data: { status: "ENDED" },
  });
  if (claimed.count === 0) return; // not expired, or already closed by another caller

  const auction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
  const winningBid = await prisma.bid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });

  await prisma.auction.update({ where: { id: auctionId }, data: { winnerId: winningBid?.bidderId ?? null } });

  if (!winningBid) {
    await notify(auction.sellerId, "AUCTION_ENDED", "Tu subasta terminó sin pujas", "Podés volver a publicarla como venta o intercambio.", `/subastas/${auction.id}`);
    return;
  }

  await prisma.clothingItem.update({ where: { id: auction.itemId }, data: { archived: true, soldAt: now } });

  // Same escrow the rest of the app uses for a sale — see /api/transactions/release.
  await prisma.transaction.create({
    data: {
      userId: winningBid.bidderId,
      amount: winningBid.amount,
      type: "ESCROW_HOLD",
      status: "PENDING",
      meta: JSON.stringify({
        buyerId: winningBid.bidderId, sellerId: auction.sellerId, itemId: auction.itemId,
        auctionId: auction.id, delivery: { type: "meetup" },
      }),
    },
  });

  const item = await prisma.clothingItem.findUnique({ where: { id: auction.itemId }, select: { title: true } });
  await notify(winningBid.bidderId, "AUCTION_WON", "¡Ganaste la subasta!", `"${item?.title ?? "la prenda"}" por $${winningBid.amount} — coordiná la entrega y confirmá la recepción`, `/subastas/${auction.id}`);
  await notify(auction.sellerId, "AUCTION_ENDED", "Tu subasta terminó con ganador", `$${winningBid.amount} por "${item?.title ?? "tu prenda"}" — el pago queda en custodia hasta que confirmen la recepción`, `/subastas/${auction.id}`);
}

export async function activateScheduledAuctions(): Promise<number> {
  const result = await prisma.auction.updateMany({
    where: { status: "SCHEDULED", startsAt: { lte: new Date() } },
    data: { status: "ACTIVE" },
  });
  return result.count;
}
