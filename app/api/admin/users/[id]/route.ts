import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, fullName: true, email: true, phone: true, address: true,
      avatar: true, bio: true, role: true, bannedAt: true, isPremium: true, premiumUntil: true,
      premiumPlan: true, credits: true, balance: true, ratingAvg: true, ratingCount: true,
      verified: true, emailVerified: true, termsAcceptedAt: true, createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [items, transactions, matchesCount, reportsReceivedCount] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { userId: id },
      select: { id: true, title: true, brand: true, price: true, archived: true, soldAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.match.count({ where: { OR: [{ userAId: id }, { userBId: id }] } }),
    prisma.report.count({ where: { reportedUserId: id } }),
  ]);

  return NextResponse.json({ user, items, transactions, matchesCount, reportsReceivedCount });
}
