import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { fullName: { contains: q } }] } : undefined,
    select: {
      id: true, name: true, fullName: true, email: true, phone: true, role: true,
      bannedAt: true, isPremium: true, premiumUntil: true, verified: true,
      credits: true, balance: true, ratingAvg: true, ratingCount: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(users);
}
