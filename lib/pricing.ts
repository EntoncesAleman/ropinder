import { getConfigNumber, setConfigNumber } from "./config";

// Precios de referencia en ARS — solo defaults / fallback. El precio real
// que se cobra puede estar sobreescrito por un admin vía Config (ver
// getEffectivePacks abajo); credits/premium/days/verified son estructurales
// y no son editables desde el admin.
export const PACKS = {
  credits_10: { credits: 10, price: 2500, currency: "ARS" as const },
  credits_30: { credits: 30, price: 6000, currency: "ARS" as const },
  credits_100: { credits: 100, price: 15000, currency: "ARS" as const },
  verified_badge: { credits: 0, price: 3500, currency: "ARS" as const, verified: true },
  premium_daily: { credits: 0, price: 1500, currency: "ARS" as const, premium: true, days: 1 },
  premium_weekly: { credits: 0, price: 4500, currency: "ARS" as const, premium: true, days: 7 },
  premium_monthly: { credits: 0, price: 7999, currency: "ARS" as const, premium: true, verified: true, days: 30 },
  premium_yearly: { credits: 0, price: 69999, currency: "ARS" as const, premium: true, verified: true, days: 365 },
};

export type PackId = keyof typeof PACKS;
export type AccountType = "PERSONAL" | "STORE";

const PACK_IDS = Object.keys(PACKS) as PackId[];

function pricingConfigKey(id: PackId): string {
  return `pricing.${id}`;
}
function storePricingConfigKey(id: PackId): string {
  return `pricing.${id}.STORE`;
}

// Store price cascades on top of the personal price rather than straight to
// the code default — so an admin who only bothers setting the personal
// price still gets a sane store price, instead of silently reverting to a
// stale hardcoded number.
export async function getPackPrice(id: PackId, accountType: AccountType = "PERSONAL"): Promise<number> {
  const personalPrice = await getConfigNumber(pricingConfigKey(id), PACKS[id].price);
  if (accountType === "PERSONAL") return personalPrice;
  return getConfigNumber(storePricingConfigKey(id), personalPrice);
}

export async function setPackPrice(id: PackId, price: number, updatedById: string, accountType: AccountType = "PERSONAL"): Promise<void> {
  const key = accountType === "STORE" ? storePricingConfigKey(id) : pricingConfigKey(id);
  await setConfigNumber(key, price, updatedById);
}

// Same shape as PACKS but with `price` overridden by whatever an admin has
// configured — this is what checkout and the pricing page must read from,
// never the raw PACKS constant, so the price charged always matches the
// price shown.
export async function getEffectivePacks(accountType: AccountType = "PERSONAL"): Promise<Record<PackId, typeof PACKS[PackId] & { price: number }>> {
  const prices = await Promise.all(PACK_IDS.map((id) => getPackPrice(id, accountType)));
  return Object.fromEntries(PACK_IDS.map((id, i) => [id, { ...PACKS[id], price: prices[i] }])) as Record<
    PackId,
    (typeof PACKS)[PackId] & { price: number }
  >;
}
