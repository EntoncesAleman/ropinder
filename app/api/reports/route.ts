import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { reportedUserId, itemId, matchId, reason, details } = await req.json();
  if (!reason?.trim())
    return NextResponse.json({ error: "Falta el motivo" }, { status: 400 });
  if (!reportedUserId && !itemId && !matchId)
    return NextResponse.json({ error: "Falta indicar qué se reporta" }, { status: 400 });

  const report = await prisma.report.create({
    data: {
      reporterId: session.id,
      reportedUserId: reportedUserId ?? null,
      itemId: itemId ?? null,
      matchId: matchId ?? null,
      reason: reason.trim(),
      details: details?.trim() ?? "",
    },
  });

  return NextResponse.json(report, { status: 201 });
}
