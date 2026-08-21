import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const items = await prisma.clothingItem.findMany({
    select: {
      id: true, title: true, brand: true, price: true, listingType: true,
      archived: true, soldAt: true, createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = items.map((i) => ({
    id: i.id, title: i.title, brand: i.brand, price: i.price ?? "", listingType: i.listingType,
    archived: i.archived, soldAt: i.soldAt?.toISOString() ?? "", createdAt: i.createdAt.toISOString(),
    sellerName: i.user.name, sellerEmail: i.user.email,
  }));

  return csvResponse("ropinder-publicaciones.csv", rows);
}
