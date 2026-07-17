import { NextRequest, NextResponse } from "next/server";

// Proxies OpenStreetMap's free Nominatim geocoder. Nominatim's usage policy
// requires a descriptive User-Agent and forbids client-side/browser calls
// directly against it, so this goes through our own server.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Ropinder/1.0 (contacto: soporte.ropinder@gmail.com)" },
  });
  if (!res.ok) return NextResponse.json([]);

  const results = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return NextResponse.json(results.map((r) => ({ label: r.display_name, latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) })));
}
