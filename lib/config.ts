import { prisma } from "./prisma";

// Generic admin-editable settings, replacing hardcoded constants one key at
// a time. A missing key is NOT an error — every call site passes the same
// default the old constant had, so this is safe to read before any admin
// has ever touched the value.
export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const row = await prisma.config.findUnique({ where: { key } });
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

export async function setConfigNumber(key: string, value: number, updatedById: string) {
  await prisma.config.upsert({
    where: { key },
    create: { key, value: String(value), updatedById },
    update: { value: String(value), updatedById },
  });
}

// Config keys in use — kept in one place so admin UI and API agree on names.
export const CONFIG_KEYS = {
  commissionStandard: "commission.standard",
  commissionPremium: "commission.premium",
  withdrawalFeeRate: "withdrawal.feeRate",
} as const;
