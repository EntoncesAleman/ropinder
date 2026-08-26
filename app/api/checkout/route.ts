import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectivePacks, PackId } from "@/lib/pricing";
import { applyPackToUser } from "@/lib/applyPack";
import { getFinancialProvider } from "@/lib/financialProvider";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { packId, paymentMethod, receiptUrl } = await req.json();
  const packs = await getEffectivePacks();
  const pack = packs[packId as PackId];
  if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 });

  // Bank transfer isn't verifiable automatically — the purchase stays
  // PENDING (no credits/premium granted yet) until an admin confirms the
  // transfer actually arrived and approves it from /admin.
  if (paymentMethod === "bank_transfer") {
    if (!receiptUrl) return NextResponse.json({ error: "Subí el comprobante de la transferencia" }, { status: 400 });

    const tx = await prisma.transaction.create({
      data: {
        userId: session.id,
        amount: pack.price,
        type: "CREDIT_PURCHASE",
        status: "PENDING",
        meta: JSON.stringify({ packId, paymentMethod: "bank_transfer", receiptUrl, credits: pack.credits, currency: pack.currency }),
      },
    });
    return NextResponse.json({ ok: true, transaction: tx, pending: true });
  }

  const charge = await getFinancialProvider().charge({ userId: session.id, amount: pack.price, meta: { packId } });
  if (charge.status !== "COMPLETED")
    return NextResponse.json({ error: "No se pudo procesar el pago" }, { status: 402 });

  await applyPackToUser(session.id, packId as PackId);

  const tx = await prisma.transaction.create({
    data: {
      userId: session.id,
      amount: pack.price,
      type: "CREDIT_PURCHASE",
      status: "COMPLETED",
      meta: JSON.stringify({ packId, paymentMethod: paymentMethod ?? "card", credits: pack.credits, currency: pack.currency, providerRef: charge.providerRef }),
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: session.id },
    select: { credits: true, balance: true, isPremium: true, premiumUntil: true, verified: true },
  });

  return NextResponse.json({ ok: true, transaction: tx, user: updated });
}
