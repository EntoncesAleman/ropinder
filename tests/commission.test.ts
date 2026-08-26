import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMMISSION_RATE_CAP, isValidCommissionRate, resolveCommissionRate, splitGrossCommission,
  DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM,
} from "../lib/commission";

test("isValidCommissionRate accepts 0 and the cap, rejects outside that range", () => {
  assert.equal(isValidCommissionRate(0), true);
  assert.equal(isValidCommissionRate(COMMISSION_RATE_CAP), true);
  assert.equal(isValidCommissionRate(-0.01), false);
  assert.equal(isValidCommissionRate(COMMISSION_RATE_CAP + 0.01), false);
  assert.equal(isValidCommissionRate(NaN), false);
});

test("resolveCommissionRate picks the premium rate only for premium sellers", () => {
  assert.equal(resolveCommissionRate(false, DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM), DEFAULT_COMMISSION_STANDARD);
  assert.equal(resolveCommissionRate(true, DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM), DEFAULT_COMMISSION_PREMIUM);
});

test("resolveCommissionRate clamps a rate above the cap instead of applying it raw", () => {
  assert.equal(resolveCommissionRate(false, 0.5, 0.5), COMMISSION_RATE_CAP);
});

test("resolveCommissionRate clamps a negative rate to 0", () => {
  assert.equal(resolveCommissionRate(false, -0.1, -0.1), 0);
});

test("splitGrossCommission: commission + netAmount always add up to the gross amount", () => {
  const { commission, netAmount } = splitGrossCommission(1000, 0.08);
  assert.equal(commission, 80);
  assert.equal(netAmount, 920);
  assert.equal(commission + netAmount, 1000);
});

test("splitGrossCommission: zero rate means the full amount is net", () => {
  const { commission, netAmount } = splitGrossCommission(500, 0);
  assert.equal(commission, 0);
  assert.equal(netAmount, 500);
});
