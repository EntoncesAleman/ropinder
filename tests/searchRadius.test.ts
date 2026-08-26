import { test } from "node:test";
import assert from "node:assert/strict";
import { clampRadiusKm, FREE_MAX_RADIUS_KM, PREMIUM_MAX_RADIUS_KM } from "../lib/searchRadius";

test("clampRadiusKm: free user requesting under the free max is unchanged", () => {
  assert.equal(clampRadiusKm(5, false), 5);
});

test("clampRadiusKm: free user requesting above the free max is capped", () => {
  assert.equal(clampRadiusKm(50, false), FREE_MAX_RADIUS_KM);
});

test("clampRadiusKm: premium user can reach the premium max", () => {
  assert.equal(clampRadiusKm(50, true), PREMIUM_MAX_RADIUS_KM);
});

test("clampRadiusKm: premium user is still capped above the premium max", () => {
  assert.equal(clampRadiusKm(9999, true), PREMIUM_MAX_RADIUS_KM);
});

test("clampRadiusKm: a non-positive or NaN request falls back to that plan's max", () => {
  assert.equal(clampRadiusKm(0, false), FREE_MAX_RADIUS_KM);
  assert.equal(clampRadiusKm(-5, true), PREMIUM_MAX_RADIUS_KM);
  assert.equal(clampRadiusKm(NaN, false), FREE_MAX_RADIUS_KM);
});
