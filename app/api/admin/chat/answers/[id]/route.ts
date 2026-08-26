import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { text?: string; order?: number; active?: boolean } = {};
  if (typeof body.text === "string") data.text = body.text.trim();
  if (typeof body.order === "number") data.order = body.order;
  if (typeof body.active === "boolean") data.active = body.active;

  const answer = await prisma.chatAnswer.update({ where: { id }, data });
  return NextResponse.json(answer);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const messageCount = await prisma.message.count({ where: { answerId: id } });
  if (messageCount > 0)
    return NextResponse.json({ error: "Esta respuesta ya se usó en conversaciones — desactivala en vez de borrarla" }, { status: 400 });

  await prisma.chatAnswer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
