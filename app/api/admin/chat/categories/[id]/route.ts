import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: { label?: string; order?: number; active?: boolean } = {};
  if (typeof body.label === "string") data.label = body.label.trim();
  if (typeof body.order === "number") data.order = body.order;
  if (typeof body.active === "boolean") data.active = body.active;

  const category = await prisma.chatCategory.update({ where: { id }, data });
  return NextResponse.json(category);
}

// "delete where safe" (Bible Loop 04) — only when nothing references it;
// otherwise deactivate instead of destroying history.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const questionCount = await prisma.chatQuestion.count({ where: { categoryId: id } });
  if (questionCount > 0)
    return NextResponse.json({ error: "Esta categoría tiene preguntas — desactivala en vez de borrarla" }, { status: 400 });

  await prisma.chatCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
