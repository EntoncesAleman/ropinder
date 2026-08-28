import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search || search.userId !== session.id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
