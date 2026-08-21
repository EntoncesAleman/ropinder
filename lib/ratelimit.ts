import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const EMAIL_WINDOW_MINUTES = 15;
const EMAIL_MAX_FAILURES = 8;
const IP_WINDOW_MINUTES = 15;
const IP_MAX_FAILURES = 25;

// Login brute-force guard: blocks once too many failed attempts land on the
// same account OR the same source IP within the window, whichever trips first.
export async function checkLoginRateLimit(email: string, ip: string): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  const emailWindowStart = new Date(Date.now() - EMAIL_WINDOW_MINUTES * 60 * 1000);
  const ipWindowStart = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000);

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, createdAt: { gte: emailWindowStart } } }),
    prisma.loginAttempt.count({ where: { ip, createdAt: { gte: ipWindowStart } } }),
  ]);

  if (emailFailures >= EMAIL_MAX_FAILURES) return { blocked: true, retryAfterSeconds: EMAIL_WINDOW_MINUTES * 60 };
  if (ipFailures >= IP_MAX_FAILURES) return { blocked: true, retryAfterSeconds: IP_WINDOW_MINUTES * 60 };
  return { blocked: false };
}

export async function recordLoginFailure(email: string, ip: string) {
  await prisma.loginAttempt.create({ data: { email, ip } });
}
