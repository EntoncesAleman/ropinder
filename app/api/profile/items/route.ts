import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";

  // likesCount/favoritesCount let the seller gauge interest vs. actual views
  // (see Ropero stats) without a separate stats endpoint or new tracking table.
  const items = await prisma.clothingItem.findMany({
    where: { userId: session.id, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ isBumped: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { swipes: { where: { type: "LIKE" } }, favorites: true } } },
  });

  const withStats = items.map((item) => ({
    ...item,
    likesCount: item._count.swipes,
    favoritesCount: item._count.favorites,
    conversionRate: item.viewCount > 0 ? item._count.swipes / item.viewCount : 0,
  }));

  return NextResponse.json(withStats);
}
