import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const rows = transactions.map((t) => ({
    id: t.id, amount: t.amount, type: t.type, status: t.status, createdAt: t.createdAt.toISOString(),
  }));

  return csvResponse("mi-historial-ropinder.csv", rows);
}
