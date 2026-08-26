import { NextResponse } from "next/server";
import { getEffectivePacks } from "@/lib/pricing";

// Public — prices aren't sensitive, and the buy page needs to show the same
// number checkout will actually charge (admin overrides included).
export async function GET() {
  const packs = await getEffectivePacks();
  return NextResponse.json(packs);
}
