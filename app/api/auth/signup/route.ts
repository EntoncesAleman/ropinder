import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hash, credits: 5 },
    select: { id: true, name: true, email: true, credits: true, balance: true, isPremium: true, avatar: true },
  });

  await prisma.transaction.create({
    data: { userId: user.id, amount: 0, type: "CREDIT_PURCHASE", status: "COMPLETED", meta: JSON.stringify({ note: "Bienvenida: 5 créditos gratis" }) },
  });

  const token = signToken(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(setTokenCookie(token));
  return res;
}
