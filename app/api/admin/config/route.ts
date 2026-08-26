import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConfigNumber, setConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { WITHDRAWAL_FEE_RATE } from "@/lib/withdrawal";
import { DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM, isValidCommissionRate, COMMISSION_RATE_CAP } from "@/lib/commission";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [commissionStandard, commissionPremium, withdrawalFeeRate] = await Promise.all([
    getConfigNumber(CONFIG_KEYS.commissionStandard, DEFAULT_COMMISSION_STANDARD),
    getConfigNumber(CONFIG_KEYS.commissionPremium, DEFAULT_COMMISSION_PREMIUM),
    getConfigNumber(CONFIG_KEYS.withdrawalFeeRate, WITHDRAWAL_FEE_RATE),
  ]);

  return NextResponse.json({ commissionStandard, commissionPremium, withdrawalFeeRate, rateCap: COMMISSION_RATE_CAP });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const edits: { key: string; value: number }[] = [];

  for (const [field, key] of Object.entries(CONFIG_KEYS)) {
    if (body[field] === undefined) continue;
    const value = Number(body[field]);
    if (!isValidCommissionRate(value))
      return NextResponse.json({ error: `${field}: tiene que ser un número entre 0 y ${COMMISSION_RATE_CAP} (${COMMISSION_RATE_CAP * 100}%)` }, { status: 400 });
    edits.push({ key, value });
  }

  if (edits.length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  await Promise.all(edits.map((e) => setConfigNumber(e.key, e.value, admin.id)));

  return NextResponse.json({ ok: true });
}
