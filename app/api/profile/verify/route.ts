import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VERIFICATION_COST_CREDITS = 50;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.verified) return NextResponse.json({ error: "Ya estás verificado" }, { status: 400 });
  if (session.credits < VERIFICATION_COST_CREDITS)
    return NextResponse.json({ error: `Necesitás ${VERIFICATION_COST_CREDITS} créditos para verificarte` }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.id },
    data: { verified: true, verifiedAt: new Date(), credits: { decrement: VERIFICATION_COST_CREDITS } },
    select: { id: true, verified: true, credits: true },
  });

  await prisma.transaction.create({
    data: { userId: session.id, amount: 0, type: "VERIFICATION", status: "COMPLETED", meta: JSON.stringify({ creditsSpent: VERIFICATION_COST_CREDITS }) },
  });

  return NextResponse.json(user);
}
