import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGuidedMessage, DEFAULT_CHAT_BANK } from "../lib/chatBank";

test("formatGuidedMessage joins question and answer with an arrow", () => {
  assert.equal(formatGuidedMessage("¿Sigue disponible?", "Sí"), "¿Sigue disponible? → Sí");
});

test("DEFAULT_CHAT_BANK: every category has at least one question", () => {
  for (const cat of DEFAULT_CHAT_BANK) assert.ok(cat.questions.length > 0, `${cat.key} has no questions`);
});

test("DEFAULT_CHAT_BANK: every question has at least one answer", () => {
  for (const cat of DEFAULT_CHAT_BANK) {
    for (const q of cat.questions) assert.ok(q.answers.length > 0, `"${q.text}" has no answers`);
  }
});

test("DEFAULT_CHAT_BANK: category keys are unique", () => {
  const keys = DEFAULT_CHAT_BANK.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
});
