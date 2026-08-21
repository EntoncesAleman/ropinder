import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { STYLES } from "@/lib/catalog";

const VALID_STYLE_IDS = new Set(STYLES.map((s) => s.id));
const MAX_BRANDS = 30;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { stylePrefs: true, brandPrefs: true },
  });
  return NextResponse.json({
    stylePrefs: JSON.parse(user?.stylePrefs ?? "[]"),
    brandPrefs: JSON.parse(user?.brandPrefs ?? "[]"),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { stylePrefs, brandPrefs } = await req.json();
  const data: Record<string, string> = {};

  if (stylePrefs !== undefined) {
    if (!Array.isArray(stylePrefs) || !stylePrefs.every((s) => typeof s === "string" && VALID_STYLE_IDS.has(s as never)))
      return NextResponse.json({ error: "Estilos inválidos" }, { status: 400 });
    data.stylePrefs = JSON.stringify(stylePrefs);
  }

  if (brandPrefs !== undefined) {
    if (!Array.isArray(brandPrefs) || !brandPrefs.every((b) => typeof b === "string") || brandPrefs.length > MAX_BRANDS)
      return NextResponse.json({ error: "Marcas inválidas" }, { status: 400 });
    data.brandPrefs = JSON.stringify(brandPrefs.map((b: string) => b.trim()).filter(Boolean).slice(0, MAX_BRANDS));
  }

  await prisma.user.update({ where: { id: session.id }, data });
  return NextResponse.json({ ok: true });
}
