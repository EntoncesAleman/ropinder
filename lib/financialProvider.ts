import { randomUUID } from "crypto";

// FinancialProviderAdapter (ROPINDER_BIBLE/LOOPS/01-FINTECH-WALLET.md §8-9):
// every money-in/money-out call site goes through this interface instead of
// touching a payment API directly, so swapping in a real provider later
// means changing getFinancialProvider() once, not every call site. This is
// specifically the in-app payment/escrow flow — not the same thing as a
// user depositing/withdrawing to their bank via MercadoPago, which is a
// separate manual flow (see app/admin/herramientas). Frontend never imports
// this — it's server-only.

export interface ChargeParams {
  userId: string;
  amount: number;
  meta?: Record<string, unknown>;
}
export interface ChargeResult {
  providerRef: string;
  status: "COMPLETED" | "FAILED";
}

export interface PayoutParams {
  userId: string;
  amount: number;
  destination: string;
  meta?: Record<string, unknown>;
}
export interface PayoutResult {
  providerRef: string;
  // PENDING: accepted, but still needs a human/rail to actually send it —
  // true for the mock today, and would stay true for most real payout APIs.
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface RefundParams {
  providerRef: string;
  amount: number;
}
export interface RefundResult {
  status: "COMPLETED" | "FAILED";
}

export interface FinancialProviderAdapter {
  readonly name: string;
  charge(params: ChargeParams): Promise<ChargeResult>;
  payout(params: PayoutParams): Promise<PayoutResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}

// No real money moves — every call simulates success. This is what
// "development uses the mock provider" (Bible §9) means in practice while
// no real provider is connected; every call site is already structured so
// swapping this for a real adapter doesn't change any calling code.
export class MockFinancialProvider implements FinancialProviderAdapter {
  readonly name = "mock";

  async charge(params: ChargeParams): Promise<ChargeResult> {
    void params;
    return { providerRef: `mock_chg_${randomUUID()}`, status: "COMPLETED" };
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    void params;
    return { providerRef: `mock_pay_${randomUUID()}`, status: "PENDING" };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    void params;
    return { status: "COMPLETED" };
  }
}

let cachedProvider: FinancialProviderAdapter | null = null;

// Single seam for the whole app. When a real provider is ready, this is the
// only function that changes (e.g. branch on process.env.PAYMENT_PROVIDER).
export function getFinancialProvider(): FinancialProviderAdapter {
  if (!cachedProvider) cachedProvider = new MockFinancialProvider();
  return cachedProvider;
}
