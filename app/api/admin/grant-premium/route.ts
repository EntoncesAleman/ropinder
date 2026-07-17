import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, days, verified } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  const d = Number(days);
  if (!Number.isInteger(d) || d <= 0) return NextResponse.json({ error: "Cantidad de días inválida" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!target) return NextResponse.json({ error: "No existe ningún usuario con ese email" }, { status: 404 });

  const base = target.isPremium && target.premiumUntil && target.premiumUntil > new Date() ? target.premiumUntil : new Date();
  const premiumUntil = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      isPremium: true, premiumUntil, premiumPlan: "admin_grant",
      ...(verified ? { verified: true, verifiedAt: new Date() } : {}),
    },
    select: { id: true, email: true, premiumUntil: true },
  });

  await prisma.transaction.create({
    data: {
      userId: target.id, amount: 0, type: "MANUAL_PREMIUM_GRANT", status: "COMPLETED",
      meta: JSON.stringify({ days: d, grantedBy: admin.email }),
    },
  });

  return NextResponse.json({ ok: true, user });
}
