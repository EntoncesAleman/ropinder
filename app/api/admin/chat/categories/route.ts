import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const categories = await prisma.chatCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { answers: { orderBy: { order: "asc" } }, _count: { select: { messages: true } } },
      },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { key, label } = await req.json().catch(() => ({}));
  if (!key?.trim() || !label?.trim()) return NextResponse.json({ error: "Faltan key/label" }, { status: 400 });

  const maxOrder = await prisma.chatCategory.aggregate({ _max: { order: true } });
  const category = await prisma.chatCategory.create({
    data: { key: key.trim(), label: label.trim(), order: (maxOrder._max.order ?? -1) + 1 },
  });
  return NextResponse.json(category, { status: 201 });
}
