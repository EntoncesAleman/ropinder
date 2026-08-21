import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id, questionId } = await params;
  const { answer } = await req.json();
  if (!answer?.trim() || answer.trim().length > 500)
    return NextResponse.json({ error: "Escribí una respuesta (máx. 500 caracteres)" }, { status: 400 });

  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { item: { select: { userId: true } } } });
  if (!question || question.itemId !== id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (question.item.userId !== session.id)
    return NextResponse.json({ error: "Solo el vendedor puede responder" }, { status: 403 });

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: { answer: answer.trim(), answeredAt: new Date() },
  });

  await notify(question.askerId, "QUESTION", "Respondieron tu pregunta", answer.trim().slice(0, 80), `/item/${id}`);

  return NextResponse.json(updated);
}
