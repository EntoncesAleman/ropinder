import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectivePacks } from "@/lib/pricing";

// Public — prices aren't sensitive, and the buy page needs to show the same
// number checkout will actually charge (admin overrides included, including
// the store-specific price a Tienda account sees).
export async function GET() {
  const session = await getSession();
  const packs = await getEffectivePacks(session?.accountType === "STORE" ? "STORE" : "PERSONAL");
  return NextResponse.json(packs);
}
