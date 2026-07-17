import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";

  const items = await prisma.clothingItem.findMany({
    where: { userId: session.id, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ isBumped: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}
