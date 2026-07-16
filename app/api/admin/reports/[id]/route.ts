import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const { status, resolution } = await req.json();
  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const report = await prisma.report.update({
    where: { id },
    data: {
      status,
      resolution: resolution?.trim() ?? "",
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json(report);
}
