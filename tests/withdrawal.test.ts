import { test } from "node:test";
import assert from "node:assert/strict";
import { feeFreeAt, splitByFeeWindow, withdrawableAfterFee, calculateWithdrawal, WITHDRAWAL_FEE_RATE } from "../lib/withdrawal";

const HOUR = 60 * 60 * 1000;

test("feeFreeAt is 24h after availableAt", () => {
  const availableAt = new Date("2026-01-01T00:00:00Z");
  assert.equal(feeFreeAt(availableAt).getTime(), availableAt.getTime() + 24 * HOUR);
});

test("splitByFeeWindow: funds still inside the 24h fee window count as withFeeAmount", () => {
  const availableAt = new Date("2026-01-01T00:00:00Z");
  const now = new Date(availableAt.getTime() + 10 * HOUR); // within the fee window
  const { withFeeAmount, noFeeAmount } = splitByFeeWindow([{ amount: 100, availableAt }], now);
  assert.equal(withFeeAmount, 100);
  assert.equal(noFeeAmount, 0);
});

test("splitByFeeWindow: funds past the 24h window count as noFeeAmount", () => {
  const availableAt = new Date("2026-01-01T00:00:00Z");
  const now = new Date(availableAt.getTime() + 25 * HOUR); // past the fee window
  const { withFeeAmount, noFeeAmount } = splitByFeeWindow([{ amount: 100, availableAt }], now);
  assert.equal(withFeeAmount, 0);
  assert.equal(noFeeAmount, 100);
});

test("withdrawableAfterFee applies WITHDRAWAL_FEE_RATE only to the fee-window portion", () => {
  const result = withdrawableAfterFee(100, 50);
  assert.equal(result, 50 + 100 * (1 - WITHDRAWAL_FEE_RATE));
});

test("calculateWithdrawal: mixed matured funds split gross/fee/net correctly", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  const matured = [
    { amount: 100, availableAt: new Date(now.getTime() - 1 * HOUR) },  // still in fee window
    { amount: 200, availableAt: new Date(now.getTime() - 30 * HOUR) }, // past fee window
  ];
  const { gross, fee, net } = calculateWithdrawal(matured, now);
  assert.equal(gross, 300);
  assert.equal(fee, 100 * WITHDRAWAL_FEE_RATE);
  assert.equal(net, gross - fee);
});

test("calculateWithdrawal: entries without availableAt are ignored", () => {
  const result = calculateWithdrawal([{ amount: 50, availableAt: null }], new Date());
  assert.deepEqual(result, { gross: 0, fee: 0, net: 0 });
});

test("calculateWithdrawal: an explicit feeRate overrides the default constant", () => {
  const now = new Date("2026-01-01T10:00:00Z");
  const matured = [{ amount: 100, availableAt: now }]; // still inside the fee window
  const result = calculateWithdrawal(matured, now, 0.10);
  assert.equal(result.fee, 10);
  assert.equal(result.net, 90);
});

test("withdrawableAfterFee: an explicit feeRate overrides the default constant", () => {
  const result = withdrawableAfterFee(100, 50, 0.10);
  assert.equal(result, 50 + 100 * 0.9);
});
