import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBid, type AuctionState } from "../lib/auction";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-01-01T12:00:00Z");

function baseAuction(overrides: Partial<AuctionState> = {}): AuctionState {
  return {
    status: "ACTIVE",
    startsAt: new Date(now.getTime() - HOUR),
    endsAt: new Date(now.getTime() + HOUR),
    currentPrice: 1000,
    minIncrement: 100,
    sellerId: "seller-1",
    ...overrides,
  };
}

test("accepts a bid at exactly currentPrice + minIncrement", () => {
  assert.equal(validateBid(baseAuction(), "bidder-1", 1100, now), null);
});

test("rejects a bid below the minimum increment", () => {
  assert.ok(validateBid(baseAuction(), "bidder-1", 1050, now));
});

test("rejects a bid equal to the current price (no increment)", () => {
  assert.ok(validateBid(baseAuction(), "bidder-1", 1000, now));
});

test("rejects a non-positive amount", () => {
  assert.ok(validateBid(baseAuction(), "bidder-1", 0, now));
  assert.ok(validateBid(baseAuction(), "bidder-1", -50, now));
});

test("rejects the seller bidding on their own auction", () => {
  assert.ok(validateBid(baseAuction(), "seller-1", 5000, now));
});

test("rejects a bid on a non-ACTIVE auction", () => {
  assert.ok(validateBid(baseAuction({ status: "ENDED" }), "bidder-1", 5000, now));
  assert.ok(validateBid(baseAuction({ status: "SCHEDULED" }), "bidder-1", 5000, now));
});

test("rejects a bid before the auction starts", () => {
  const auction = baseAuction({ startsAt: new Date(now.getTime() + HOUR), endsAt: new Date(now.getTime() + 2 * HOUR) });
  assert.ok(validateBid(auction, "bidder-1", 5000, now));
});

test("rejects a bid after the auction ends", () => {
  const auction = baseAuction({ endsAt: new Date(now.getTime() - 1) });
  assert.ok(validateBid(auction, "bidder-1", 5000, now));
});
