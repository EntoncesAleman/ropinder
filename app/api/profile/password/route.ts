import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return NextResponse.json({ error: "Completá ambas contraseñas (nueva mín. 6 caracteres)" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session.id }, data: { password: hash } });

  return NextResponse.json({ ok: true });
}
