import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendSupportEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Escribí tu consulta" }, { status: 400 });

  const { sent } = await sendSupportEmail(session.email, session.name, message.trim());
  return NextResponse.json({ ok: true, sent });
}
