import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const seller = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatar: true, bio: true, ratingAvg: true, ratingCount: true, verified: true, createdAt: true, bannedAt: true },
  });
  if (!seller || seller.bannedAt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const items = await prisma.clothingItem.findMany({
    where: { userId: id, archived: false },
    orderBy: [{ isBumped: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ seller, items });
}
