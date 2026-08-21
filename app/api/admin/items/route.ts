import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const listingType = searchParams.get("listingType") ?? "";
  const status = searchParams.get("status") ?? ""; // "active" | "archived" | ""

  const where: Prisma.ClothingItemWhereInput = {
    OR: q ? [{ title: { contains: q } }, { brand: { contains: q } }, { user: { name: { contains: q } } }] : undefined,
    listingType: listingType || undefined,
    archived: status === "active" ? false : status === "archived" ? true : undefined,
  };

  const items = await prisma.clothingItem.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { reports: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(items);
}
