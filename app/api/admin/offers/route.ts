import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Read-only: Offer already covers both money offers and item-for-item trades
// (offeredItemId) — see ARCHITECTURE.md §2 for why there's no separate
// "Intercambio" table to administer.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const offers = await prisma.offer.findMany({
    include: {
      item: { select: { id: true, title: true } },
      offeredItem: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(offers);
}
