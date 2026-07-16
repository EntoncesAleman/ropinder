import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true, bannedAt: true } },
      item: { select: { id: true, title: true, imageUrl: true } },
      match: { select: { id: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(reports);
}
