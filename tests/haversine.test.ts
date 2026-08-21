import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm } from "../lib/haversine";

test("distance from a point to itself is 0", () => {
  assert.equal(haversineKm(-34.6, -58.4, -34.6, -58.4), 0);
});

test("Buenos Aires to Córdoba is roughly 650km", () => {
  const km = haversineKm(-34.6037, -58.3816, -31.4201, -64.1888);
  assert.ok(km > 600 && km < 700, `expected ~650km, got ${km}`);
});
