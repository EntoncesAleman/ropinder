// Precios de referencia en ARS — ajustar según inflación/mercado real
// antes de conectar un medio de pago real (MercadoPago).
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
