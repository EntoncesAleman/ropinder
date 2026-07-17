import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const transactions = await prisma.transaction.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = transactions.map((t) => ({
    id: t.id, userEmail: t.user.email, amount: t.amount, type: t.type, status: t.status,
    createdAt: t.createdAt.toISOString(), meta: t.meta,
  }));

  return csvResponse("ropinder-transacciones.csv", rows);
}
