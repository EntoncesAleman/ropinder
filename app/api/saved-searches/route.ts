import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SavedSearchQuery, isSavedSearchQueryTooBroad } from "@/lib/savedSearch";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({ where: { userId: session.id, active: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(searches.map((s) => ({ ...s, query: JSON.parse(s.query) })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query: SavedSearchQuery = {
    category: typeof body.category === "string" ? body.category.trim() || undefined : undefined,
    brand: typeof body.brand === "string" ? body.brand.trim() || undefined : undefined,
    size: typeof body.size === "string" ? body.size.trim() || undefined : undefined,
    style: typeof body.style === "string" ? body.style.trim() || undefined : undefined,
    priceMax: body.priceMax !== undefined && body.priceMax !== "" ? Number(body.priceMax) : undefined,
    q: typeof body.q === "string" ? body.q.trim() || undefined : undefined,
  };
  if (query.priceMax !== undefined && (!Number.isFinite(query.priceMax) || query.priceMax <= 0))
    return NextResponse.json({ error: "Precio máximo inválido" }, { status: 400 });
  if (isSavedSearchQueryTooBroad(query))
    return NextResponse.json({ error: "Elegí al menos un filtro (categoría, marca, talle, estilo, precio o texto)" }, { status: 400 });

  const saved = await prisma.savedSearch.create({ data: { userId: session.id, query: JSON.stringify(query) } });
  return NextResponse.json({ ...saved, query });
}
