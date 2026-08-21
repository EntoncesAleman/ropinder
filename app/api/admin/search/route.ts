import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Global admin search (topbar) — real queries against Users and
// ClothingItems, capped small since this is a quick-jump lookup, not a
// full search page. Extend here (not with a separate fake "search module")
// if more entities need to be findable this way.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [], items: [] });

  const [users, items] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { fullName: { contains: q } }] },
      select: { id: true, name: true, email: true, avatar: true },
      take: 5,
    }),
    prisma.clothingItem.findMany({
      where: { OR: [{ title: { contains: q } }, { brand: { contains: q } }] },
      select: { id: true, title: true, imageUrl: true, user: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ users, items });
}
