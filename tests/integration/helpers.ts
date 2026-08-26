import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";

// Shared fixtures for integration tests — these hit a real (throwaway)
// SQLite database via lib/prisma.ts, unlike tests/*.test.ts which are pure
// logic. Every id is randomized so tests can run without cleaning up after
// each other and without caring about execution order.
export async function makeUser(overrides: Partial<{ role: string; isPremium: boolean; credits: number; balance: number }> = {}) {
  const id = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      name: `user_${id}`,
      email: `user_${id}@test.ropinder`,
      password: "x",
      role: overrides.role ?? "USER",
      isPremium: overrides.isPremium ?? false,
      credits: overrides.credits ?? 0,
      balance: overrides.balance ?? 0,
    },
  });
}

export async function makeAdmin() {
  return makeUser({ role: "ADMIN" });
}
