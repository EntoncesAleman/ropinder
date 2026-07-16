import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.id },
    include: { item: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "Falta itemId" }, { status: 400 });

  const favorite = await prisma.favorite.upsert({
    where: { userId_itemId: { userId: session.id, itemId } },
    create: { userId: session.id, itemId },
    update: {},
  });
  return NextResponse.json(favorite, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "Falta itemId" }, { status: 400 });

  await prisma.favorite.deleteMany({ where: { userId: session.id, itemId } });
  return NextResponse.json({ ok: true });
}
