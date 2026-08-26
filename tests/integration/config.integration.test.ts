import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { getConfigNumber, setConfigNumber } from "../../lib/config";
import { makeAdmin } from "./helpers";

test("getConfigNumber falls back when no row exists yet", async () => {
  const key = `test.missing.${randomUUID()}`;
  assert.equal(await getConfigNumber(key, 42), 42);
});

test("setConfigNumber then getConfigNumber round-trips through a real database", async () => {
  const admin = await makeAdmin();
  const key = `test.rate.${randomUUID()}`;

  await setConfigNumber(key, 0.15, admin.id);
  assert.equal(await getConfigNumber(key, 42), 0.15);

  // Second write upserts the same row rather than creating a duplicate.
  await setConfigNumber(key, 0.2, admin.id);
  assert.equal(await getConfigNumber(key, 42), 0.2);

  const rows = await prisma.config.findMany({ where: { key } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].updatedById, admin.id);
});
