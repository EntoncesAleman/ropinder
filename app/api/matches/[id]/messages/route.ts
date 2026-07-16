import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const other = await prisma.user.findUnique({
    where: { id: match.userAId === session.id ? match.userBId : match.userAId },
    select: { id: true, name: true, avatar: true, ratingAvg: true, ratingCount: true },
  });

  const myRating = await prisma.rating.findUnique({ where: { matchId_raterId: { matchId: id, raterId: session.id } } });

  const messages = await prisma.message.findMany({
    where: { matchId: id },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  const escrowTx = await prisma.transaction.findFirst({
    where: { type: { in: ["ESCROW_HOLD", "ESCROW_RELEASE"] }, meta: { contains: `"matchId":"${id}"` } },
    orderBy: { createdAt: "desc" },
  });
  const escrow = escrowTx
    ? { ...escrowTx, meta: JSON.parse(escrowTx.meta) as { buyerId?: string; sellerId?: string } }
    : null;

  return NextResponse.json({ match, other, messages, escrow, myRating });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const message = await prisma.message.create({
    data: { matchId: id, senderId: session.id, text: text.trim() },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
  });

  const recipientId = match.userAId === session.id ? match.userBId : match.userAId;
  await notify(recipientId, "MESSAGE", `Nuevo mensaje de ${message.sender.name}`, text.trim().slice(0, 80), `/matches/${id}`);

  return NextResponse.json(message, { status: 201 });
}
