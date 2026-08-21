import { test } from "node:test";
import assert from "node:assert/strict";
import { findContactInfoReason } from "../lib/chatFilter";

test("blocks an email address", () => {
  assert.ok(findContactInfoReason("escribime a juan@example.com"));
});

test("blocks a real phone number", () => {
  assert.ok(findContactInfoReason("mi numero es 11 4567 8900"));
});

test("does not block short digit sequences (e.g. a size or price)", () => {
  assert.equal(findContactInfoReason("te lo dejo en 40"), null);
});

test("blocks WhatsApp mentions", () => {
  assert.ok(findContactInfoReason("mejor hablemos por whatsapp"));
});

test("blocks requests to move the deal off-platform", () => {
  assert.ok(findContactInfoReason("prefiero coordinar por afuera de la app"));
});

test("allows ordinary chat text with no contact info", () => {
  assert.equal(findContactInfoReason("hola, todavia esta disponible la campera?"), null);
});
