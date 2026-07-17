import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const blocked = await prisma.blockedEmail.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(blocked);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { email, reason } = await req.json();
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  if (cleanEmail === admin.email.toLowerCase())
    return NextResponse.json({ error: "No podés bloquear tu propio email" }, { status: 400 });

  const blocked = await prisma.blockedEmail.upsert({
    where: { email: cleanEmail },
    update: { reason: reason?.trim() ?? "", blockedBy: admin.email },
    create: { email: cleanEmail, reason: reason?.trim() ?? "", blockedBy: admin.email },
  });

  return NextResponse.json(blocked);
}
