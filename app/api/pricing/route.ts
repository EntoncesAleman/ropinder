import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectivePacks } from "@/lib/pricing";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_VIP_PUBLISH_COST, DEFAULT_VIP_UNLOCK_COST } from "@/lib/vip";

// Public — prices aren't sensitive, and the buy page needs to show the same
// number checkout will actually charge (admin overrides included, including
// the store-specific price a Tienda account sees). Also carries the VIP
// credit costs so their displayed price never drifts from what
// /api/clothes/[id] (publishVip) and /vip-unlock actually charge.
export async function GET() {
  const session = await getSession();
  const [packs, vipPublishCost, vipUnlockCost] = await Promise.all([
    getEffectivePacks(session?.accountType === "STORE" ? "STORE" : "PERSONAL"),
    getConfigNumber(CONFIG_KEYS.vipPublishCost, DEFAULT_VIP_PUBLISH_COST),
    getConfigNumber(CONFIG_KEYS.vipUnlockCost, DEFAULT_VIP_UNLOCK_COST),
  ]);
  return NextResponse.json({ packs, vipPublishCost, vipUnlockCost });
}
