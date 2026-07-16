// Precios de referencia en ARS — ajustar según inflación/mercado real
// antes de conectar un medio de pago real (MercadoPago).
export const PACKS = {
  credits_10: { credits: 10, price: 2500, currency: "ARS" as const },
  credits_30: { credits: 30, price: 6000, currency: "ARS" as const },
  credits_100: { credits: 100, price: 15000, currency: "ARS" as const },
  verified_badge: { credits: 0, price: 3500, currency: "ARS" as const, verified: true },
  premium_monthly: { credits: 0, price: 7999, currency: "ARS" as const, premium: true, verified: true },
};

export type PackId = keyof typeof PACKS;
