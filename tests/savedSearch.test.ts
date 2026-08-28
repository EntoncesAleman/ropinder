import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSavedSearch, isSavedSearchQueryTooBroad } from "../lib/savedSearch";

const baseItem = { title: "Campera Nike talle M", category: "Ropa", brand: "Nike", size: "M", style: "deportivo", price: 8000 };

test("matchesSavedSearch: empty query matches everything", () => {
  assert.equal(matchesSavedSearch({}, baseItem), true);
});

test("matchesSavedSearch: category/brand/size/style are case-insensitive exact matches", () => {
  assert.equal(matchesSavedSearch({ brand: "nike" }, baseItem), true);
  assert.equal(matchesSavedSearch({ brand: "Adidas" }, baseItem), false);
  assert.equal(matchesSavedSearch({ size: "m" }, baseItem), true);
  assert.equal(matchesSavedSearch({ size: "L" }, baseItem), false);
});

test("matchesSavedSearch: priceMax excludes items above it, and items with no price", () => {
  assert.equal(matchesSavedSearch({ priceMax: 10000 }, baseItem), true);
  assert.equal(matchesSavedSearch({ priceMax: 5000 }, baseItem), false);
  assert.equal(matchesSavedSearch({ priceMax: 10000 }, { ...baseItem, price: null }), false);
});

test("matchesSavedSearch: q is a case-insensitive substring match against the title", () => {
  assert.equal(matchesSavedSearch({ q: "campera" }, baseItem), true);
  assert.equal(matchesSavedSearch({ q: "pantalón" }, baseItem), false);
});

test("matchesSavedSearch: every set field must match (AND, not OR)", () => {
  assert.equal(matchesSavedSearch({ brand: "Nike", size: "L" }, baseItem), false);
  assert.equal(matchesSavedSearch({ brand: "Nike", size: "M" }, baseItem), true);
});

test("isSavedSearchQueryTooBroad: true only when every field is unset", () => {
  assert.equal(isSavedSearchQueryTooBroad({}), true);
  assert.equal(isSavedSearchQueryTooBroad({ brand: "Nike" }), false);
  assert.equal(isSavedSearchQueryTooBroad({ priceMax: 1000 }), false);
});
