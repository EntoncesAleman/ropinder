import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const { banned } = await req.json();

  if (id === admin.id)
    return NextResponse.json({ error: "No podés banearte a vos mismo" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { bannedAt: banned ? new Date() : null },
    select: { id: true, name: true, email: true, bannedAt: true },
  });

  return NextResponse.json(user);
}
