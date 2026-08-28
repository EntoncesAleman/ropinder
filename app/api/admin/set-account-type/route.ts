import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, accountType } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  if (!["PERSONAL", "STORE"].includes(accountType)) return NextResponse.json({ error: "Tipo de cuenta inválido" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!target) return NextResponse.json({ error: "No existe ningún usuario con ese email" }, { status: 404 });

  const user = await prisma.user.update({ where: { id: target.id }, data: { accountType }, select: { id: true, email: true, accountType: true } });
  logAdminAction(admin.id, accountType === "STORE" ? "ACCOUNT_SET_STORE" : "ACCOUNT_SET_PERSONAL", "User", target.id, { email: user.email }).catch(() => {});

  return NextResponse.json({ ok: true, user });
}
