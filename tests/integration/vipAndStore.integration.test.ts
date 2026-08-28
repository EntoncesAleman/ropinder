import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { findOrCreateMatch } from "../../lib/match";
import { getEffectivePacks, setPackPrice, PACKS } from "../../lib/pricing";
import { makeUser, makeAdmin } from "./helpers";

test("findOrCreateMatch creates a real Match between two users with no prior swipes (the VIP bypass)", async () => {
  const buyer = await makeUser();
  const seller = await makeUser();

  const { matchId, created } = await findOrCreateMatch(buyer.id, seller.id, "test", () => "test body");
  assert.ok(created);

  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  assert.ok(
    (match.userAId === buyer.id && match.userBId === seller.id) ||
    (match.userAId === seller.id && match.userBId === buyer.id)
  );
});

test("findOrCreateMatch is idempotent — a second call between the same pair reuses the Match", async () => {
  const buyer = await makeUser();
  const seller = await makeUser();

  const first = await findOrCreateMatch(buyer.id, seller.id, "test", () => "test body");
  const second = await findOrCreateMatch(buyer.id, seller.id, "test", () => "test body");

  assert.equal(first.matchId, second.matchId);
  assert.equal(second.created, false);

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: buyer.id, userBId: seller.id }, { userAId: seller.id, userBId: buyer.id }] },
  });
  assert.equal(matches.length, 1); // never creates a duplicate
});

test("findOrCreateMatch also reuses a Match that already exists in the reverse direction", async () => {
  const a = await makeUser();
  const b = await makeUser();
  const existing = await prisma.match.create({ data: { userAId: b.id, userBId: a.id } });

  const { matchId, created } = await findOrCreateMatch(a.id, b.id, "test", () => "test body");
  assert.equal(matchId, existing.id);
  assert.equal(created, false);
});

test("store pricing overrides only apply to STORE accountType, PERSONAL stays at its own price", async () => {
  const admin = await makeAdmin();
  const key = "credits_10" as const;

  await setPackPrice(key, 1000, admin.id, "PERSONAL");
  await setPackPrice(key, 5000, admin.id, "STORE");

  const personal = await getEffectivePacks("PERSONAL");
  const store = await getEffectivePacks("STORE");

  assert.equal(personal[key].price, 1000);
  assert.equal(store[key].price, 5000);
});

test("store price falls back to the personal price when no store-specific override exists", async () => {
  const admin = await makeAdmin();
  // premium_yearly has no store override anywhere in this test run, but a
  // fresh personal override should still cascade to the store price.
  const key = "premium_yearly" as const;
  await setPackPrice(key, 12345, admin.id, "PERSONAL");

  const store = await getEffectivePacks("STORE");
  assert.equal(store[key].price, 12345);
});

test("store price with no override at all falls back to the code default", async () => {
  const store = await getEffectivePacks("STORE");
  assert.equal(store.credits_30.price, PACKS.credits_30.price);
});
