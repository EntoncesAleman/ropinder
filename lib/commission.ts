// Commission Engine — pure math, no DB. Rates themselves live in Config
// (see lib/config.ts); this module only knows how to combine and validate
// them, so it's unit-testable without a database.

// "20% ES EL TECHO ABSOLUTO" — spec requirement, enforced both here (so a
// bad admin edit can never silently apply) and in the admin API that writes
// the config values.
export const COMMISSION_RATE_CAP = 0.20;

export const DEFAULT_COMMISSION_STANDARD = 0.08;
export const DEFAULT_COMMISSION_PREMIUM = 0.05;

export function isValidCommissionRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 0 && rate <= COMMISSION_RATE_CAP;
}

// Clamps to the cap rather than rejecting outright at read-time — a rate
// that was valid when saved but would exceed a lowered cap in the future
// should never silently overcharge a seller.
export function resolveCommissionRate(sellerIsPremium: boolean, standardRate: number, premiumRate: number): number {
  const rate = sellerIsPremium ? premiumRate : standardRate;
  return Math.min(Math.max(rate, 0), COMMISSION_RATE_CAP);
}

export function splitGrossCommission(grossAmount: number, rate: number): { commission: number; netAmount: number } {
  const commission = grossAmount * rate;
  return { commission, netAmount: grossAmount - commission };
}
