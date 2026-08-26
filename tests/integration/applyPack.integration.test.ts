import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { applyPackToUser } from "../../lib/applyPack";
import { makeUser } from "./helpers";

test("applyPackToUser grants credits without touching premium", async () => {
  const user = await makeUser({ credits: 5 });
  await applyPackToUser(user.id, "credits_10");
  const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(reloaded.credits, 15);
  assert.equal(reloaded.isPremium, false);
});

test("applyPackToUser grants the verified badge alongside a monthly premium pack", async () => {
  const user = await makeUser();
  await applyPackToUser(user.id, "premium_monthly");
  const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(reloaded.isPremium, true);
  assert.equal(reloaded.verified, true);
  assert.equal(reloaded.premiumPlan, "premium_monthly");
});

test("applyPackToUser stacks a second premium purchase on top of remaining time instead of resetting it", async () => {
  const user = await makeUser();
  await applyPackToUser(user.id, "premium_weekly"); // +7 days
  const afterFirst = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const firstUntil = afterFirst.premiumUntil!.getTime();

  await applyPackToUser(user.id, "premium_weekly"); // another +7 days, from firstUntil not from now
  const afterSecond = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const secondUntil = afterSecond.premiumUntil!.getTime();

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(secondUntil - (firstUntil + sevenDaysMs)) < 5000);
});
