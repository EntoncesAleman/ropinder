import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const rating = await prisma.rating.findUnique({ where: { matchId_raterId: { matchId: id, raterId: session.id } } });
  return NextResponse.json({ rating });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { score, comment } = await req.json();
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return NextResponse.json({ error: "El puntaje debe ser entre 1 y 5" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const ratedUserId = match.userAId === session.id ? match.userBId : match.userAId;

  const existing = await prisma.rating.findUnique({ where: { matchId_raterId: { matchId: id, raterId: session.id } } });
  if (existing) return NextResponse.json({ error: "Ya calificaste este match" }, { status: 400 });

  const rating = await prisma.rating.create({
    data: { matchId: id, raterId: session.id, ratedUserId, score, comment: comment?.trim() ?? "" },
  });

  const agg = await prisma.rating.aggregate({ where: { ratedUserId }, _avg: { score: true }, _count: true });
  await prisma.user.update({
    where: { id: ratedUserId },
    data: { ratingAvg: agg._avg.score ?? 0, ratingCount: agg._count },
  });

  return NextResponse.json(rating, { status: 201 });
}
