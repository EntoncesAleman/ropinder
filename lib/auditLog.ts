import { prisma } from "./prisma";

// Only call this from routes that change something a real support/finance
// team would need to trace back later — see AdminAuditLog's doc comment in
// schema.prisma for which actions qualify. Never awaited in a way that can
// block or fail the action it's logging; a logging failure must not undo a
// real admin action, so callers fire-and-forget with .catch(() => {}).
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, meta: JSON.stringify(meta) },
  });
}
