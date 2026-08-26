import { test } from "node:test";
import assert from "node:assert/strict";
import { MockFinancialProvider, getFinancialProvider } from "../lib/financialProvider";

test("MockFinancialProvider.charge always completes with a unique providerRef", async () => {
  const provider = new MockFinancialProvider();
  const a = await provider.charge({ userId: "u1", amount: 100 });
  const b = await provider.charge({ userId: "u1", amount: 100 });
  assert.equal(a.status, "COMPLETED");
  assert.match(a.providerRef, /^mock_chg_/);
  assert.notEqual(a.providerRef, b.providerRef);
});

test("MockFinancialProvider.payout is PENDING, not COMPLETED — still needs a human to send it", async () => {
  const provider = new MockFinancialProvider();
  const result = await provider.payout({ userId: "u1", amount: 100, destination: "cbu-123" });
  assert.equal(result.status, "PENDING");
  assert.match(result.providerRef, /^mock_pay_/);
});

test("MockFinancialProvider.refund always completes", async () => {
  const provider = new MockFinancialProvider();
  const result = await provider.refund({ providerRef: "mock_chg_abc", amount: 50 });
  assert.equal(result.status, "COMPLETED");
});

test("getFinancialProvider returns the same cached instance across calls", () => {
  assert.equal(getFinancialProvider(), getFinancialProvider());
});
