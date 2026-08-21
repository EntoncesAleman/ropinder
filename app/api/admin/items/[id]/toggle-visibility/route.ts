import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Admin hide/restore — reuses ClothingItem.archived (same field a sold item
// uses) rather than a parallel "hidden" flag. A restored item just re-enters
// the feed like any other active, unarchived listing.
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const updated = await prisma.clothingItem.update({ where: { id }, data: { archived: !item.archived } });
  return NextResponse.json({ ok: true, archived: updated.archived });
}
