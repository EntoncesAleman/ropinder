import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { categoryId, text } = await req.json().catch(() => ({}));
  if (!categoryId || !text?.trim()) return NextResponse.json({ error: "Faltan categoryId/text" }, { status: 400 });

  const maxOrder = await prisma.chatQuestion.aggregate({ where: { categoryId }, _max: { order: true } });
  const question = await prisma.chatQuestion.create({
    data: { categoryId, text: text.trim(), order: (maxOrder._max.order ?? -1) + 1 },
    include: { answers: true },
  });
  return NextResponse.json(question, { status: 201 });
}
