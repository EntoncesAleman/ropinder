import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { email: true } },
      reportedUser: { select: { email: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = reports.map((r) => ({
    id: r.id, reason: r.reason, details: r.details, status: r.status, resolution: r.resolution,
    reporterEmail: r.reporter.email, reportedUserEmail: r.reportedUser?.email ?? "",
    reviewedByEmail: r.reviewedBy?.email ?? "", createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? "",
  }));

  return csvResponse("ropinder-reportes.csv", rows);
}
