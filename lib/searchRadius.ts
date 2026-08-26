// Search radius tiers (Bible Loop 02 / §15: "Premium can unlock larger
// search radius... do not hardcode a single radius into frontend code").
// Free users can reach the "city" tier; Premium unlocks the widest one.
export const RADIUS_STEPS_KM = [1, 5, 20, 50] as const;
export const FREE_MAX_RADIUS_KM = 20;
export const PREMIUM_MAX_RADIUS_KM = 50;

// Server-authoritative — never trust the client's radius param past what
// this user's plan allows, even though the UI already hides the option.
export function clampRadiusKm(requestedKm: number, isPremium: boolean): number {
  const max = isPremium ? PREMIUM_MAX_RADIUS_KM : FREE_MAX_RADIUS_KM;
  if (!Number.isFinite(requestedKm) || requestedKm <= 0) return max;
  return Math.min(requestedKm, max);
}
