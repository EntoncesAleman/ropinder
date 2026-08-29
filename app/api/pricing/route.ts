import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectivePacks } from "@/lib/pricing";
import { getConfigNumber, CONFIG_KEYS } from "@/lib/config";
import { DEFAULT_VIP_PUBLISH_COST, DEFAULT_VIP_UNLOCK_COST } from "@/lib/vip";
import { DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM } from "@/lib/commission";

// Public — prices aren't sensitive, and the buy page needs to show the same
// number checkout will actually charge (admin overrides included, including
// the store-specific price a Tienda account sees). Also carries the VIP
// credit costs and commission rates so nothing on /premium's marketing copy
// can drift from what Config actually charges.
export async function GET() {
  const session = await getSession();
  const [packs, vipPublishCost, vipUnlockCost, commissionStandard, commissionPremium] = await Promise.all([
    getEffectivePacks(session?.accountType === "STORE" ? "STORE" : "PERSONAL"),
    getConfigNumber(CONFIG_KEYS.vipPublishCost, DEFAULT_VIP_PUBLISH_COST),
    getConfigNumber(CONFIG_KEYS.vipUnlockCost, DEFAULT_VIP_UNLOCK_COST),
    getConfigNumber(CONFIG_KEYS.commissionStandard, DEFAULT_COMMISSION_STANDARD),
    getConfigNumber(CONFIG_KEYS.commissionPremium, DEFAULT_COMMISSION_PREMIUM),
  ]);
  return NextResponse.json({ packs, vipPublishCost, vipUnlockCost, commissionStandard, commissionPremium });
}
