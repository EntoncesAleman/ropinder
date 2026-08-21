import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activateScheduledAuctions, closeExpiredAuction } from "@/lib/closeAuction";

// Runs once a day (Vercel Hobby plan's cron limit — see vercel.json). This is
// just the safety net: any GET on an auction closes it lazily too if it's
// overdue, so the daily sweep only matters for auctions nobody's looked at.
// Same auth pattern as /api/cron/monthly-reset: Vercel signs its own cron
// requests; anyone else needs CRON_SECRET as a Bearer token.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (!isVercelCron && auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const activated = await activateScheduledAuctions();

  const toClose = await prisma.auction.findMany({
    where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const { id } of toClose) await closeExpiredAuction(id);

  return NextResponse.json({ ok: true, activated, closed: toClose.length, ranAt: new Date().toISOString() });
}
