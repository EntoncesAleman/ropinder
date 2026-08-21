import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// Two demo users near the same Buenos Aires location, one with a priced
// listing and one with a canje (trade) listing, so the full discover → match
// → offer/trade → chat flow can be exercised without hitting external APIs
// (Google Sign-In, Nominatim geocoding) that a manual signup would need.
//
// Seeds whatever database lib/prisma.ts resolves to — TURSO_DATABASE_URL if
// set, otherwise local dev.db. Run with `TURSO_DATABASE_URL= npm run db:seed`
// to force local SQLite and avoid writing demo rows into a real Turso DB.
async function main() {
  const password = await bcrypt.hash("demo1234", 10);

  const ana = await prisma.user.upsert({
    where: { email: "ana.demo@ropinder.test" },
    update: {},
    create: {
      name: "ana_demo", fullName: "Ana Demo", email: "ana.demo@ropinder.test", password,
      credits: 20, emailVerified: true, termsAcceptedAt: new Date(),
      address: "Av. Corrientes 1000", latitude: -34.6037, longitude: -58.3816,
    },
  });

  const beto = await prisma.user.upsert({
    where: { email: "beto.demo@ropinder.test" },
    update: {},
    create: {
      name: "beto_demo", fullName: "Beto Demo", email: "beto.demo@ropinder.test", password,
      credits: 20, emailVerified: true, termsAcceptedAt: new Date(),
      address: "Av. Santa Fe 2000", latitude: -34.5953, longitude: -58.4050,
    },
  });

  await prisma.clothingItem.upsert({
    where: { id: "seed-item-ana-jacket" },
    update: {},
    create: {
      id: "seed-item-ana-jacket",
      title: "Campera de jean", brand: "Levi's", size: "M", condition: "Muy bueno",
      category: "Ropa", imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5",
      price: 8000, latitude: ana.latitude, longitude: ana.longitude, userId: ana.id,
    },
  });

  await prisma.clothingItem.upsert({
    where: { id: "seed-item-beto-sneakers" },
    update: {},
    create: {
      id: "seed-item-beto-sneakers",
      title: "Zapatillas urbanas", brand: "Adidas", size: "42", condition: "Bueno",
      category: "Calzado", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
      price: null, latitude: beto.latitude, longitude: beto.longitude, userId: beto.id,
    },
  });

  console.log("Seeded:", { ana: ana.email, beto: beto.email, password: "demo1234" });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
