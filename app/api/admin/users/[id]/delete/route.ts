import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (id === admin.id) return NextResponse.json({ error: "No podés borrarte a vos mismo" }, { status: 400 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "No se puede borrar a otro admin — primero quitale el rol" }, { status: 400 });

  const items = await prisma.clothingItem.findMany({ where: { userId: id }, select: { id: true } });
  const itemIds = items.map((i) => i.id);
  const matches = await prisma.match.findMany({ where: { OR: [{ userAId: id }, { userBId: id }] }, select: { id: true } });
  const matchIds = matches.map((m) => m.id);

  await prisma.$transaction([
    prisma.swipe.deleteMany({ where: { OR: [{ swiperId: id }, { targetItemId: { in: itemIds } }] } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId: id }, { itemId: { in: itemIds } }] } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: id }, { reportedUserId: id }, { reviewedById: id }, { itemId: { in: itemIds } }] } }),
    prisma.rating.deleteMany({ where: { OR: [{ raterId: id }, { ratedUserId: id }, { matchId: { in: matchIds } }] } }),
    prisma.message.deleteMany({ where: { OR: [{ senderId: id }, { matchId: { in: matchIds } }] } }),
    prisma.match.deleteMany({ where: { id: { in: matchIds } } }),
    prisma.clothingItem.deleteMany({ where: { userId: id } }),
    prisma.transaction.deleteMany({ where: { userId: id } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.pushToken.deleteMany({ where: { userId: id } }),
    prisma.verificationCode.deleteMany({ where: { email: target.email } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
