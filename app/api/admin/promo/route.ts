import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { mode, credits, note } = await req.json();
  const amount = Number(credits);
  if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "Cantidad de créditos inválida" }, { status: 400 });
  if (!["ALL", "RAFFLE"].includes(mode)) return NextResponse.json({ error: "Modo inválido" }, { status: 400 });

  const eligible = await prisma.user.findMany({ where: { bannedAt: null }, select: { id: true, email: true } });
  if (eligible.length === 0) return NextResponse.json({ error: "No hay usuarios elegibles" }, { status: 400 });

  if (mode === "ALL") {
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: eligible.map((u) => u.id) } }, data: { credits: { increment: amount } } }),
      ...eligible.map((u) =>
        prisma.transaction.create({
          data: { userId: u.id, amount: 0, type: "PROMO_CREDIT", status: "COMPLETED", meta: JSON.stringify({ credits: amount, note: note?.trim() ?? "", grantedBy: admin.email }) },
        })
      ),
    ]);
    return NextResponse.json({ ok: true, usersAffected: eligible.length });
  }

  // RAFFLE — pick one random eligible user.
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  await prisma.user.update({ where: { id: winner.id }, data: { credits: { increment: amount } } });
  await prisma.transaction.create({
    data: { userId: winner.id, amount: 0, type: "PROMO_RAFFLE_WIN", status: "COMPLETED", meta: JSON.stringify({ credits: amount, note: note?.trim() ?? "", grantedBy: admin.email }) },
  });

  return NextResponse.json({ ok: true, winnerEmail: winner.email, poolSize: eligible.length });
}
