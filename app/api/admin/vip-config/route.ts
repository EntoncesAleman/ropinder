import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/auditLog";
import { getConfigNumber, setConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_VIP_PUBLISH_COST, DEFAULT_VIP_UNLOCK_COST } from "@/lib/vip";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [vipPublishCost, vipUnlockCost] = await Promise.all([
    getConfigNumber(CONFIG_KEYS.vipPublishCost, DEFAULT_VIP_PUBLISH_COST),
    getConfigNumber(CONFIG_KEYS.vipUnlockCost, DEFAULT_VIP_UNLOCK_COST),
  ]);

  return NextResponse.json({ vipPublishCost, vipUnlockCost });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const edits: { field: "vipPublishCost" | "vipUnlockCost"; value: number }[] = [];

  for (const field of ["vipPublishCost", "vipUnlockCost"] as const) {
    if (body[field] === undefined) continue;
    const value = Number(body[field]);
    if (!Number.isInteger(value) || value < 0)
      return NextResponse.json({ error: `${field}: tiene que ser un número entero mayor o igual a 0` }, { status: 400 });
    edits.push({ field, value });
  }

  if (edits.length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  await Promise.all(edits.map((e) => setConfigNumber(CONFIG_KEYS[e.field], e.value, admin.id)));

  logAdminAction(admin.id, "VIP_CONFIG_UPDATED", "Config", null, Object.fromEntries(edits.map((e) => [e.field, e.value]))).catch(() => {});

  return NextResponse.json({ ok: true });
}
