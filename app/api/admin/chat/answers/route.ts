import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { questionId, text } = await req.json().catch(() => ({}));
  if (!questionId || !text?.trim()) return NextResponse.json({ error: "Faltan questionId/text" }, { status: 400 });

  const maxOrder = await prisma.chatAnswer.aggregate({ where: { questionId }, _max: { order: true } });
  const answer = await prisma.chatAnswer.create({
    data: { questionId, text: text.trim(), order: (maxOrder._max.order ?? -1) + 1 },
  });
  return NextResponse.json(answer, { status: 201 });
}
