// availableAt already marks release + 48h. Withdrawing between that and
// +24h more (i.e. release + 72h) costs a fee; after that it's free.
const FEE_WINDOW_HOURS = 24;
export const WITHDRAWAL_FEE_RATE = 0.05;

export function feeFreeAt(availableAt: Date): Date {
  return new Date(availableAt.getTime() + FEE_WINDOW_HOURS * 60 * 60 * 1000);
}

export interface MaturedFunds {
  amount: number;
  availableAt: Date | null;
}

// Splits matured (already-released, not-yet-withdrawn) funds into the part
// still inside the fee window and the part past it, as of `now`.
export function splitByFeeWindow(matured: MaturedFunds[], now: Date) {
  let withFeeAmount = 0;
  let noFeeAmount = 0;
  for (const t of matured) {
    if (!t.availableAt) continue;
    if (now < feeFreeAt(t.availableAt)) withFeeAmount += t.amount;
    else noFeeAmount += t.amount;
  }
  return { withFeeAmount, noFeeAmount };
}

// feeRate defaults to WITHDRAWAL_FEE_RATE so existing callers/tests are
// unaffected; API routes pass the admin-configurable rate explicitly
// (see lib/config.ts).
export function withdrawableAfterFee(withFeeAmount: number, noFeeAmount: number, feeRate: number = WITHDRAWAL_FEE_RATE): number {
  return noFeeAmount + withFeeAmount * (1 - feeRate);
}

// Same split, expressed as gross/fee/net for the actual withdrawal request
// (as opposed to the GET preview above, which keeps with/no-fee separate).
export function calculateWithdrawal(matured: MaturedFunds[], now: Date, feeRate: number = WITHDRAWAL_FEE_RATE) {
  let gross = 0;
  let fee = 0;
  for (const t of matured) {
    if (!t.availableAt) continue;
    gross += t.amount;
    if (now < feeFreeAt(t.availableAt)) fee += t.amount * feeRate;
  }
  return { gross, fee, net: gross - fee };
}
