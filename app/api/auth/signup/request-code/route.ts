import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

const CODE_TTL_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MINUTES = 15;
const MIN_FORM_SECONDS = 2;

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const { name, fullName, email, password, hp, formRenderedAt } = await req.json();

  // Honeypot: real users never see or fill this field. Bots that fill every input trip it.
  if (hp) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  // Reject submissions faster than a human could plausibly fill the form.
  if (typeof formRenderedAt === "number" && Date.now() - formRenderedAt < MIN_FORM_SECONDS * 1000)
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  if (!name?.trim() || !fullName?.trim() || !email?.trim() || !password || password.length < 6)
    return NextResponse.json({ error: "Completá todos los campos (contraseña mín. 6 caracteres)" }, { status: 400 });

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });

  const existingName = await prisma.user.findUnique({ where: { name: name.trim() } });
  if (existingName) return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const recentRequests = await prisma.verificationCode.count({
    where: { email, purpose: "SIGNUP", createdAt: { gte: windowStart } },
  });
  if (recentRequests >= MAX_REQUESTS_PER_WINDOW)
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos y volvé a intentar." }, { status: 429 });

  const code = randomCode();
  await prisma.verificationCode.create({
    data: { email, code, purpose: "SIGNUP", expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000) },
  });

  const { sent } = await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true, emailSent: sent, devCode: sent ? undefined : code });
}
