import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [
    totalUsers, bannedUsers, premiumUsers, verifiedUsers,
    totalItems, totalMatches, pendingReports, resolvedReports,
    releases,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { verified: true } }),
    prisma.clothingItem.count(),
    prisma.match.count(),
    prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWED"] } } }),
    prisma.report.count({ where: { status: { in: ["RESOLVED", "DISMISSED"] } } }),
    prisma.transaction.findMany({ where: { type: "ESCROW_RELEASE" }, select: { meta: true } }),
  ]);

  let gmv = 0;
  let commissionEarned = 0;
  for (const r of releases) {
    try {
      const meta = JSON.parse(r.meta) as { grossAmount?: number; commission?: number };
      gmv += meta.grossAmount ?? 0;
      commissionEarned += meta.commission ?? 0;
    } catch {
      /* ignore malformed meta */
    }
  }

  const revenue = await prisma.transaction.aggregate({
    where: { type: "CREDIT_PURCHASE" },
    _sum: { amount: true },
  });

  return NextResponse.json({
    totalUsers, bannedUsers, premiumUsers, verifiedUsers,
    totalItems, totalMatches, pendingReports, resolvedReports,
    escrowTransactions: releases.length,
    gmv, commissionEarned,
    creditsAndPremiumRevenue: revenue._sum.amount ?? 0,
  });
}
