import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FREE_MONTHLY_CREDITS } from "@/lib/limits";

// Runs monthly (see vercel.json). Vercel signs its own cron requests with
// this header; anyone else needs CRON_SECRET as a Bearer token.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (!isVercelCron && auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Free-tier credits are a monthly allowance, not cumulative — this
  // resets everyone's balance to the standard amount rather than adding to it.
  const creditsReset = await prisma.user.updateMany({
    where: { isPremium: false, bannedAt: null },
    data: { credits: FREE_MONTHLY_CREDITS },
  });

  // Free listings expire on a rolling 30-day basis; Premium listings have
  // expiresAt: null and are skipped.
  const listingsArchived = await prisma.clothingItem.updateMany({
    where: { archived: false, expiresAt: { lte: new Date() } },
    data: { archived: true },
  });

  return NextResponse.json({
    ok: true,
    usersReset: creditsReset.count,
    listingsArchived: listingsArchived.count,
    ranAt: new Date().toISOString(),
  });
}
