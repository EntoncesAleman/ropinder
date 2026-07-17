import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, fullName: true, email: true, phone: true, role: true,
      bannedAt: true, isPremium: true, premiumPlan: true, verified: true,
      credits: true, balance: true, ratingAvg: true, ratingCount: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = users.map((u) => ({ ...u, bannedAt: u.bannedAt?.toISOString() ?? "", createdAt: u.createdAt.toISOString() }));

  return csvResponse("ropinder-usuarios.csv", rows);
}
