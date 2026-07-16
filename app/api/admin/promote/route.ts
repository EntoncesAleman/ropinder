import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  if (!["ADMIN", "USER"].includes(role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!target) return NextResponse.json({ error: "No existe ningún usuario con ese email" }, { status: 404 });

  if (target.id === admin.id && role === "USER")
    return NextResponse.json({ error: "No podés quitarte el rol de admin a vos mismo" }, { status: 400 });

  const user = await prisma.user.update({ where: { id: target.id }, data: { role }, select: { id: true, email: true, role: true } });
  return NextResponse.json({ ok: true, user });
}
