import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { amount } = await req.json();
  if (typeof amount !== "number" || amount <= 0)
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const existing = await prisma.transaction.findFirst({
    where: { type: "ESCROW_HOLD", status: "PENDING", meta: { contains: `"matchId":"${id}"` } },
  });
  if (existing) return NextResponse.json({ error: "Ya hay un pago en custodia para este match" }, { status: 400 });

  const sellerId = match.userAId === session.id ? match.userBId : match.userAId;

  // Simulated card charge — Ropinder holds the funds in escrow until receipt is confirmed.
  await new Promise((r) => setTimeout(r, 300));

  const tx = await prisma.transaction.create({
    data: {
      userId: session.id,
      amount,
      type: "ESCROW_HOLD",
      status: "PENDING",
      meta: JSON.stringify({ matchId: id, buyerId: session.id, sellerId }),
    },
  });

  return NextResponse.json(tx, { status: 201 });
}
