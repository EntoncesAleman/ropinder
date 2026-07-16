import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    if (user.bannedAt) return NextResponse.json({ error: "Esta cuenta fue suspendida" }, { status: 403 });

    const token = signToken(user.id);
    const res = NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, credits: user.credits, balance: user.balance, isPremium: user.isPremium, avatar: user.avatar, role: user.role },
    });
    res.cookies.set(setTokenCookie(token));
    return res;
  } catch (e) {
    console.error("LOGIN_ERROR", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
