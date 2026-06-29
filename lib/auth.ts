import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET ?? "ropinder-dev-secret-change-in-prod";
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
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, avatar: true, bio: true,
      isPremium: true, credits: true, balance: true, latitude: true, longitude: true,
    },
  });
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
