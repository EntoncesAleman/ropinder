import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Formato no soportado (solo JPG, PNG o WebP)" }, { status: 400 });
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "La imagen no puede pesar más de 8MB" }, { status: 400 });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Vercel's serverless functions don't have a persistent/writable public/
    // directory, so production uploads go to Vercel Blob. Local dev (no
    // BLOB_READ_WRITE_TOKEN) falls back to writing into public/uploads.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${filename}`, file, { access: "public" });
      return NextResponse.json({ url: blob.url });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Falta configurar el almacenamiento de imágenes (BLOB_READ_WRITE_TOKEN) en el proyecto de Vercel." },
        { status: 500 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Error subiendo la imagen" }, { status: 500 });
  }
}
