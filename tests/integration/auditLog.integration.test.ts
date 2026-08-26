import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { logAdminAction } from "../../lib/auditLog";
import { makeAdmin, makeUser } from "./helpers";

test("logAdminAction writes a row readable the same way GET /api/admin/logs reads it", async () => {
  const admin = await makeAdmin();
  const target = await makeUser();

  await logAdminAction(admin.id, "USER_BANNED", "User", target.id, { email: target.email });

  // Same shape as app/api/admin/logs/route.ts's query.
  const [log] = await prisma.adminAuditLog.findMany({
    where: { adminId: admin.id, action: "USER_BANNED" },
    include: { admin: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(log);
  assert.equal(log.targetType, "User");
  assert.equal(log.targetId, target.id);
  assert.equal(log.admin.email, admin.email);
  assert.deepEqual(JSON.parse(log.meta), { email: target.email });
});

test("logAdminAction never mutates the target it logs about", async () => {
  const admin = await makeAdmin();
  const target = await makeUser({ credits: 7 });

  await logAdminAction(admin.id, "CREDITS_GRANTED", "User", target.id, { credits: 999 });

  const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
  assert.equal(reloaded.credits, 7); // logging is a side-channel, never the source of truth
});
