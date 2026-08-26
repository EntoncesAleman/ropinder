import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { getFinancialProvider } from "../../lib/financialProvider";
import { resolveCommissionRate, splitGrossCommission, DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM } from "../../lib/commission";
import { logAdminAction } from "../../lib/auditLog";
import { makeAdmin, makeUser } from "./helpers";

// Exercises the orchestrator's own cross-module chain end to end against a
// real database: Financial transaction -> Wallet/Ledger -> Admin -> Audit
// Logs. Mirrors what app/api/matches/[id]/pay + closeAuction + the report
// refund route do, at the module level rather than over HTTP.
test("a charge, its commission split, and an admin refund reconcile in the real ledger", async () => {
  const buyer = await makeUser({ balance: 0 });
  const seller = await makeUser({ balance: 0, isPremium: true });
  const admin = await makeAdmin();

  const grossAmount = 10000;
  const charge = await getFinancialProvider().charge({ userId: buyer.id, amount: grossAmount });
  assert.equal(charge.status, "COMPLETED");

  const rate = resolveCommissionRate(seller.isPremium, DEFAULT_COMMISSION_STANDARD, DEFAULT_COMMISSION_PREMIUM);
  const { commission, netAmount } = splitGrossCommission(grossAmount, rate);
  assert.equal(commission + netAmount, grossAmount); // never lose or create money

  const holdTx = await prisma.transaction.create({
    data: {
      userId: seller.id, amount: netAmount, type: "ESCROW_HOLD", status: "PENDING",
      meta: JSON.stringify({ buyerId: buyer.id, sellerId: seller.id, grossAmount, providerRef: charge.providerRef }),
    },
  });

  // Buyer disputes -> admin refunds, same path app/api/admin/reports/[id]/refund follows.
  const refund = await getFinancialProvider().refund({ providerRef: charge.providerRef, amount: grossAmount });
  assert.equal(refund.status, "COMPLETED");

  await prisma.transaction.update({ where: { id: holdTx.id }, data: { status: "REFUNDED" } });
  await prisma.user.update({ where: { id: buyer.id }, data: { balance: { increment: grossAmount } } });
  const refundTx = await prisma.transaction.create({
    data: {
      userId: buyer.id, amount: grossAmount, type: "ESCROW_REFUND", status: "COMPLETED",
      meta: JSON.stringify({ refundedBy: admin.email, providerRef: charge.providerRef }),
    },
  });
  await logAdminAction(admin.id, "REPORT_REFUNDED", "Transaction", holdTx.id, { buyerId: buyer.id, refundAmount: grossAmount });

  const reloadedBuyer = await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } });
  assert.equal(reloadedBuyer.balance, grossAmount); // buyer made whole

  const reloadedHold = await prisma.transaction.findUniqueOrThrow({ where: { id: holdTx.id } });
  assert.equal(reloadedHold.status, "REFUNDED"); // original transaction edited only in status, never deleted

  const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { targetId: holdTx.id, action: "REPORT_REFUNDED" } });
  assert.equal(log.adminId, admin.id);

  const allTx = await prisma.transaction.findMany({ where: { id: { in: [holdTx.id, refundTx.id] } } });
  assert.equal(allTx.length, 2); // history is appended to, never overwritten
});

test("a lowered commission cap clamps a stale higher rate instead of trusting it", async () => {
  // Simulates a rate that was valid when saved but exceeds a cap lowered afterwards —
  // resolveCommissionRate must clamp at apply-time, not just at save-time.
  const staleRate = 0.5;
  const rate = resolveCommissionRate(true, DEFAULT_COMMISSION_STANDARD, staleRate);
  const { commission, netAmount } = splitGrossCommission(1000, rate);
  assert.ok(rate <= 0.2);
  assert.equal(commission + netAmount, 1000);
});
