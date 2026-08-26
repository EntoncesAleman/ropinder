import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/auditLog";
import { PACKS, PackId, getEffectivePacks, setPackPrice } from "@/lib/pricing";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const effective = await getEffectivePacks();
  const packs = (Object.keys(PACKS) as PackId[]).map((id) => ({
    id,
    price: effective[id].price,
    defaultPrice: PACKS[id].price,
    currency: PACKS[id].currency,
    credits: PACKS[id].credits,
    premium: "premium" in PACKS[id] ? true : false,
    verified: "verified" in PACKS[id] ? true : false,
    days: "days" in PACKS[id] ? PACKS[id].days : null,
  }));

  return NextResponse.json(packs);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const prices = body.prices as Record<string, unknown> | undefined;
  if (!prices || typeof prices !== "object")
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const edits: { id: PackId; price: number }[] = [];
  for (const [id, raw] of Object.entries(prices)) {
    if (!(id in PACKS)) return NextResponse.json({ error: `Pack inválido: ${id}` }, { status: 400 });
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0)
      return NextResponse.json({ error: `${id}: el precio tiene que ser un número mayor o igual a 0` }, { status: 400 });
    edits.push({ id: id as PackId, price });
  }

  if (edits.length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  await Promise.all(edits.map((e) => setPackPrice(e.id, e.price, admin.id)));

  logAdminAction(admin.id, "PACK_PRICE_UPDATED", "Config", null, Object.fromEntries(edits.map((e) => [e.id, e.price]))).catch(() => {});

  return NextResponse.json({ ok: true });
}
