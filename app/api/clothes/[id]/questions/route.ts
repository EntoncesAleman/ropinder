import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  // Public Q&A — visible to anyone browsing the listing, not just the asker.
  const questions = await prisma.question.findMany({
    where: { itemId: id },
    include: { asker: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim() || text.trim().length > 500)
    return NextResponse.json({ error: "Escribí una pregunta (máx. 500 caracteres)" }, { status: 400 });

  const item = await prisma.clothingItem.findUnique({ where: { id }, select: { userId: true, title: true, archived: true } });
  if (!item || item.archived) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const question = await prisma.question.create({
    data: { itemId: id, askerId: session.id, text: text.trim() },
    include: { asker: { select: { id: true, name: true, avatar: true } } },
  });

  if (item.userId !== session.id) {
    await notify(item.userId, "QUESTION", "Te hicieron una pregunta", `Sobre "${item.title}": ${text.trim().slice(0, 80)}`, `/item/${id}`);
  }

  return NextResponse.json(question, { status: 201 });
}
