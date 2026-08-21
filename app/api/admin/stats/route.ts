import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface ActivityItem {
  id: string;
  kind: "USER" | "ITEM" | "SALE" | "REPORT" | "AUCTION" | "BID";
  label: string;
  detail: string;
  link: string;
  createdAt: string;
}

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

  // "Requiere atención" — every count here is something an admin can act on
  // right now, each with a concrete link. Nothing here is decorative.
  const [pendingBankTransfers, pendingWithdrawals, reportedUsers, activeAuctions] = await Promise.all([
    prisma.transaction.count({ where: { status: "PENDING", type: "CREDIT_PURCHASE", meta: { contains: "bank_transfer" } } }),
    prisma.transaction.count({ where: { status: "PENDING", type: "WITHDRAWAL" } }),
    prisma.report.findMany({ where: { status: { in: ["PENDING", "REVIEWED"] }, reportedUserId: { not: null } }, select: { reportedUserId: true }, distinct: ["reportedUserId"] }),
    prisma.auction.count({ where: { status: "ACTIVE" } }),
  ]);

  // Activity feed — merges the most recent row from each table that
  // represents something actually happening on the platform, not a mock feed.
  const [recentUsers, recentItems, recentSales, recentReports, recentAuctions, recentBids] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, createdAt: true } }),
    prisma.clothingItem.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, listingType: true, createdAt: true, user: { select: { name: true } } } }),
    prisma.transaction.findMany({ where: { type: "ESCROW_RELEASE" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, amount: true, createdAt: true, user: { select: { name: true } } } }),
    prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reason: true, createdAt: true, reporter: { select: { name: true } } } }),
    prisma.auction.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, startingPrice: true, createdAt: true, item: { select: { title: true } } } }),
    prisma.bid.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, amount: true, createdAt: true, auctionId: true, bidder: { select: { name: true } } } }),
  ]);

  const activity: ActivityItem[] = [
    ...recentUsers.map((u): ActivityItem => ({ id: `u-${u.id}`, kind: "USER", label: "Nuevo usuario", detail: u.name, link: `/admin/users/${u.id}`, createdAt: u.createdAt.toISOString() })),
    ...recentItems.map((i): ActivityItem => ({ id: `i-${i.id}`, kind: "ITEM", label: `Nueva publicación (${i.listingType})`, detail: `"${i.title}" de ${i.user.name}`, link: `/item/${i.id}`, createdAt: i.createdAt.toISOString() })),
    ...recentSales.map((s): ActivityItem => ({ id: `s-${s.id}`, kind: "SALE", label: "Venta cobrada", detail: `$${s.amount.toFixed(2)} — ${s.user.name}`, link: "/admin/transacciones", createdAt: s.createdAt.toISOString() })),
    ...recentReports.map((r): ActivityItem => ({ id: `r-${r.id}`, kind: "REPORT", label: "Nuevo reporte", detail: `${r.reason} — de ${r.reporter.name}`, link: "/admin/reportes", createdAt: r.createdAt.toISOString() })),
    ...recentAuctions.map((a): ActivityItem => ({ id: `a-${a.id}`, kind: "AUCTION", label: "Nueva subasta", detail: `"${a.item.title}" desde $${a.startingPrice}`, link: `/subastas/${a.id}`, createdAt: a.createdAt.toISOString() })),
    ...recentBids.map((b): ActivityItem => ({ id: `b-${b.id}`, kind: "BID", label: "Nueva puja", detail: `$${b.amount} — ${b.bidder.name}`, link: `/subastas/${b.auctionId}`, createdAt: b.createdAt.toISOString() })),
  ].sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()).slice(0, 15);

  return NextResponse.json({
    totalUsers, bannedUsers, premiumUsers, verifiedUsers,
    totalItems, totalMatches, pendingReports, resolvedReports,
    escrowTransactions: releases.length,
    gmv, commissionEarned,
    creditsAndPremiumRevenue: revenue._sum.amount ?? 0,
    attention: {
      pendingReports,
      pendingBankTransfers,
      pendingWithdrawals,
      reportedUsers: reportedUsers.length,
      activeAuctions,
    },
    activity,
  });
}
