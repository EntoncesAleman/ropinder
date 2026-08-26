import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS, getEffectivePacks, setPackPrice } from "../../lib/pricing";
import { makeAdmin } from "./helpers";

// Covers the drift bug this cycle fixed: /premium and /api/checkout must
// both resolve through getEffectivePacks(), so an admin override is never
// visible on one side and not the other.
test("getEffectivePacks falls back to PACKS defaults when nothing is overridden", async () => {
  const effective = await getEffectivePacks();
  for (const id of Object.keys(PACKS) as (keyof typeof PACKS)[]) {
    assert.equal(effective[id].price, PACKS[id].price);
    assert.equal(effective[id].credits, PACKS[id].credits);
  }
});

test("setPackPrice overrides only the targeted pack, others stay at default", async () => {
  const admin = await makeAdmin();
  await setPackPrice("credits_10", 9999, admin.id);

  const effective = await getEffectivePacks();
  assert.equal(effective.credits_10.price, 9999);
  assert.equal(effective.credits_30.price, PACKS.credits_30.price);
  assert.equal(effective.premium_monthly.price, PACKS.premium_monthly.price);

  // Structural fields (credits/premium/days) are never touched by pricing overrides.
  assert.equal(effective.credits_10.credits, PACKS.credits_10.credits);
});
