import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Read-only guided-chat bank for the quick-reply picker — any authenticated
// user, not just admins. Only active categories/questions/answers, in order.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const categories = await prisma.chatCategory.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      questions: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: { answers: { where: { active: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json(categories);
}
