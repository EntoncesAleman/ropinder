import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, newPassword } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: "La contraseña nueva debe tener mín. 6 caracteres" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!target) return NextResponse.json({ error: "No existe ningún usuario con ese email" }, { status: 404 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: target.id }, data: { password: hash } });

  return NextResponse.json({ ok: true });
}
