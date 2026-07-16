import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error("JWT_SECRET env var is required");
const COOKIE = "ropinder_token";

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token) {
    const hdrs = await headers();
    const auth = hdrs.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice("Bearer ".length);
  }
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;

  const select = {
    id: true, name: true, email: true, avatar: true, bio: true, phone: true,
    isPremium: true, premiumUntil: true, credits: true, balance: true, latitude: true, longitude: true,
    role: true, bannedAt: true, ratingAvg: true, ratingCount: true,
    verified: true, emailVerified: true,
  } as const;

  const user = await prisma.user.findUnique({ where: { id: userId }, select });
  if (!user) return null;

  // Lazily expire premium instead of running a cron: the first read after
  // premiumUntil has passed flips it back to false.
  if (user.isPremium && user.premiumUntil && user.premiumUntil < new Date()) {
    await prisma.user.update({ where: { id: userId }, data: { isPremium: false } });
    user.isPremium = false;
  }

  return user;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export function setTokenCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
  };
}

export function clearTokenCookie() {
  return { name: COOKIE, value: "", maxAge: 0, path: "/" };
}
