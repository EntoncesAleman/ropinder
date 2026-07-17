import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { signToken, setTokenCookie } from "@/lib/auth";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

async function uniqueUsernameFrom(base: string): Promise<string> {
  const cleanBase = base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "usuario";
  let candidate = cleanBase;
  let i = 0;
  while (await prisma.user.findUnique({ where: { name: candidate } })) {
    i += 1;
    candidate = `${cleanBase}${i}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  if (!CLIENT_ID) return NextResponse.json({ error: "Google Sign-In no está configurado" }, { status: 501 });

  const { idToken, latitude, longitude } = await req.json();
  if (!idToken) return NextResponse.json({ error: "Falta el token de Google" }, { status: 400 });

  const client = new OAuth2Client(CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return NextResponse.json({ error: "Token de Google inválido" }, { status: 401 });
  }
  if (!payload?.email || !payload.email_verified)
    return NextResponse.json({ error: "Tu cuenta de Google no tiene un email verificado" }, { status: 401 });

  const blocked = await prisma.blockedEmail.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (blocked) return NextResponse.json({ error: "No podemos registrar ese email" }, { status: 403 });

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    if (typeof latitude !== "number" || typeof longitude !== "number")
      return NextResponse.json({ error: "Necesitamos tu ubicación (GPS) para crear la cuenta" }, { status: 400 });

    const username = await uniqueUsernameFrom(payload.email.split("@")[0]);
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(randomPassword, 10);

    user = await prisma.user.create({
      data: {
        name: username,
        fullName: payload.name ?? "",
        email: payload.email,
        password: hash,
        avatar: payload.picture ?? undefined,
        credits: 5,
        emailVerified: true,
        termsAcceptedAt: new Date(),
        latitude, longitude,
      },
    });

    await prisma.transaction.create({
      data: { userId: user.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "Bienvenida: 5 créditos gratis" }) },
    });
  }

  if (user.bannedAt) return NextResponse.json({ error: "Esta cuenta fue suspendida" }, { status: 403 });

  const token = signToken(user.id);
  const res = NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, credits: user.credits, balance: user.balance, isPremium: user.isPremium, avatar: user.avatar, role: user.role },
  });
  res.cookies.set(setTokenCookie(token));
  return res;
}
