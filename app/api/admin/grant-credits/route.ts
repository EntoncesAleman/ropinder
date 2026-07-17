import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, credits, note } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  const amount = Number(credits);
  if (!Number.isInteger(amount) || amount === 0)
    return NextResponse.json({ error: "Cantidad de créditos inválida" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!target) return NextResponse.json({ error: "No existe ningún usuario con ese email" }, { status: 404 });

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { credits: { increment: amount } },
    select: { id: true, email: true, credits: true },
  });

  await prisma.transaction.create({
    data: {
      userId: target.id, amount: 0, type: "MANUAL_CREDIT_GRANT", status: "COMPLETED",
      meta: JSON.stringify({ credits: amount, note: note?.trim() ?? "", grantedBy: admin.email }),
    },
  });

  return NextResponse.json({ ok: true, user });
}
