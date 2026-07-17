import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, avatar, bio, phone, address, latitude, longitude } = await req.json();
  const data: Record<string, string | number> = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    if (trimmed !== session.name) {
      const taken = await prisma.user.findUnique({ where: { name: trimmed } });
      if (taken) return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }
    data.name = trimmed;
  }
  if (avatar !== undefined) data.avatar = String(avatar);
  if (bio !== undefined) data.bio = String(bio).slice(0, 280);
  if (phone !== undefined) data.phone = String(phone).slice(0, 30);
  if (address !== undefined) data.address = String(address).slice(0, 200);
  if (typeof latitude === "number" && typeof longitude === "number") {
    data.latitude = latitude;
    data.longitude = longitude;
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
    select: { id: true, name: true, email: true, avatar: true, bio: true, phone: true, address: true, latitude: true, longitude: true },
  });

  return NextResponse.json({ user });
}
