import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setTokenCookie } from "@/lib/auth";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, code } = await req.json();
    if (!name?.trim() || !email?.trim() || !password || !code)
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

    const record = await prisma.verificationCode.findFirst({
      where: { email, purpose: "SIGNUP" },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return NextResponse.json({ error: "Pedí un código nuevo" }, { status: 400 });
    if (record.expiresAt < new Date()) return NextResponse.json({ error: "El código venció, pedí uno nuevo" }, { status: 400 });
    if (record.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Demasiados intentos, pedí un código nuevo" }, { status: 429 });

    if (record.code !== code) {
      await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
    const existingName = await prisma.user.findUnique({ where: { name: name.trim() } });
    if (existingName) return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email, password: hash, credits: 5, emailVerified: true },
      select: { id: true, name: true, email: true, credits: true, balance: true, isPremium: true, avatar: true },
    });

    await prisma.transaction.create({
      data: { userId: user.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "Bienvenida: 5 créditos gratis" }) },
    });

    await prisma.verificationCode.delete({ where: { id: record.id } });

    const token = signToken(user.id);
    const res = NextResponse.json({ token, user });
    res.cookies.set(setTokenCookie(token));
    return res;
  } catch (e) {
    console.error("SIGNUP_VERIFY_ERROR", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
