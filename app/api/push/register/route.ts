import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { token, platform } = await req.json();
  if (!token?.trim()) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: session.id, platform: platform ?? "web" },
    create: { userId: session.id, token, platform: platform ?? "web" },
  });

  return NextResponse.json({ ok: true });
}
