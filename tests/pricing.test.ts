import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS } from "../lib/pricing";

test("every pack has a positive price", () => {
  for (const [id, pack] of Object.entries(PACKS)) {
    assert.ok(pack.price > 0, `${id} should have a positive price`);
  }
});

test("every premium pack has a positive number of days", () => {
  for (const [id, pack] of Object.entries(PACKS)) {
    if ("premium" in pack && pack.premium) {
      assert.ok(pack.days > 0, `${id} is a premium pack and should have days > 0`);
    }
  }
});
