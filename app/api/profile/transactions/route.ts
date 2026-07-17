import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transactions);
}
