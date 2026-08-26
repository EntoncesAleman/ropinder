import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { formatGuidedMessage } from "@/lib/chatBank";

// Sends a guided (quick-reply) message — the text always comes from an
// active bank entry, never from arbitrary user input, so this never needs
// the contact-info moderation free text goes through (lib/chatFilter.ts).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { answerId } = await req.json().catch(() => ({ answerId: undefined }));
  if (!answerId) return NextResponse.json({ error: "Falta answerId" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== session.id && match.userBId !== session.id))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const answer = await prisma.chatAnswer.findUnique({
    where: { id: answerId },
    include: { question: { include: { category: true } } },
  });
  if (!answer || !answer.active || !answer.question.active || !answer.question.category.active)
    return NextResponse.json({ error: "Esa respuesta ya no está disponible" }, { status: 400 });

  const text = formatGuidedMessage(answer.question.text, answer.text);

  const message = await prisma.message.create({
    data: { matchId: id, senderId: session.id, text, kind: "GUIDED", questionId: answer.questionId, answerId: answer.id },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
  });

  const recipientId = match.userAId === session.id ? match.userBId : match.userAId;
  await notify(recipientId, "MESSAGE", `Nuevo mensaje de ${message.sender.name}`, text.slice(0, 80), `/matches/${id}`);

  return NextResponse.json(message, { status: 201 });
}
