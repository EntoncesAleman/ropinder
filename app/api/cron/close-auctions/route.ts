import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Runs every few minutes (see vercel.json). Same auth pattern as
// /api/cron/monthly-reset: Vercel signs its own cron requests; anyone else
// needs CRON_SECRET as a Bearer token.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (!isVercelCron && auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date();

  const activated = await prisma.auction.updateMany({
    where: { status: "SCHEDULED", startsAt: { lte: now } },
    data: { status: "ACTIVE" },
  });

  // The client-side countdown is presentation only — this is what actually
  // decides a winner. Highest bid wins; no bids means no sale, item just
  // stops being biddable.
  const toClose = await prisma.auction.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
  });

  let closedCount = 0;
  let soldCount = 0;
  for (const auction of toClose) {
    const winningBid = auction.bids[0];
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: "ENDED", winnerId: winningBid?.bidderId ?? null },
    });
    closedCount++;

    if (winningBid) {
      soldCount++;
      await prisma.clothingItem.update({
        where: { id: auction.itemId },
        data: { archived: true, soldAt: now },
      });
      const item = await prisma.clothingItem.findUnique({ where: { id: auction.itemId }, select: { title: true } });
      await notify(winningBid.bidderId, "AUCTION_WON", "¡Ganaste la subasta!", `"${item?.title ?? "la prenda"}" por $${winningBid.amount}`, `/subastas/${auction.id}`);
      await notify(auction.sellerId, "AUCTION_ENDED", "Tu subasta terminó con ganador", `$${winningBid.amount} por "${item?.title ?? "tu prenda"}"`, `/subastas/${auction.id}`);
    } else {
      await notify(auction.sellerId, "AUCTION_ENDED", "Tu subasta terminó sin pujas", "Podés volver a publicarla como venta o intercambio.", `/subastas/${auction.id}`);
    }
  }

  return NextResponse.json({
    ok: true,
    activated: activated.count,
    closed: closedCount,
    sold: soldCount,
    ranAt: now.toISOString(),
  });
}
