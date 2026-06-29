import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: session.id }, { userBId: session.id }] },
    include: {
      userA: { select: { id: true, name: true, avatar: true } },
      userB: { select: { id: true, name: true, avatar: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = matches.map((m) => ({
    ...m,
    other: m.userAId === session.id ? m.userB : m.userA,
    lastMessage: m.messages[0] ?? null,
  }));

  return NextResponse.json(enriched);
}
