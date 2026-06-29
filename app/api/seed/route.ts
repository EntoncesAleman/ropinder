import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const CLOTHES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80",
  "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&q=80",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80",
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80",
  "https://images.unsplash.com/photo-1503341338985-95ad4f13b3a3?w=600&q=80",
  "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
];

export async function POST() {
  const pw = await bcrypt.hash("password123", 10);

  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.clothingItem.deleteMany();
  await prisma.user.deleteMany();

  const demo = await prisma.user.create({ data: { id: "user_demo", name: "Vos (Demo)", email: "demo@ropinder.com", password: pw, avatar: "https://i.pravatar.cc/150?img=70", credits: 5, latitude: -34.46, longitude: -58.53 } });
  const user1 = await prisma.user.create({ data: { name: "Valentina M.", email: "valentina@test.com", password: pw, avatar: "https://i.pravatar.cc/150?img=47", credits: 8, latitude: -34.442, longitude: -58.53 } });
  const user2 = await prisma.user.create({ data: { name: "Matias R.", email: "matias@test.com", password: pw, avatar: "https://i.pravatar.cc/150?img=12", credits: 6, isPremium: true, latitude: -34.46, longitude: -58.467 } });
  const user3 = await prisma.user.create({ data: { name: "Lucia F.", email: "lucia@test.com", password: pw, avatar: "https://i.pravatar.cc/150?img=32", credits: 4, latitude: -34.685, longitude: -58.53 } });

  const demoItem1 = await prisma.clothingItem.create({ data: { title: "Chaqueta vaquera azul", description: "Clásica y cómoda", size: "M", brand: "Zara", condition: "Muy bueno", category: "Ropa", imageUrl: CLOTHES[5], price: 15.0, latitude: demo.latitude, longitude: demo.longitude, userId: demo.id } });

  await prisma.clothingItem.createMany({ data: [
    { title: "Vestido negro floral", size: "S", brand: "H&M", condition: "Nuevo", category: "Ropa", imageUrl: CLOTHES[0], latitude: demo.latitude, longitude: demo.longitude, userId: demo.id },
    { title: "Campera de cuero negra", size: "S", brand: "Rapsodia", condition: "Nuevo", category: "Ropa", imageUrl: CLOTHES[1], price: 25.0, latitude: user1.latitude, longitude: user1.longitude, userId: user1.id, isBumped: true, bumpedAt: new Date() },
    { title: "Blusa de seda blanca", size: "M", brand: "H&M", condition: "Bueno", category: "Ropa", imageUrl: CLOTHES[2], latitude: user1.latitude, longitude: user1.longitude, userId: user1.id },
    { title: "Camisa de lino azul", size: "L", brand: "Banana Republic", condition: "Nuevo", category: "Ropa", imageUrl: CLOTHES[3], price: 12.0, latitude: user2.latitude, longitude: user2.longitude, userId: user2.id },
    { title: "Jean skinny gris", size: "32", brand: "Levis", condition: "Muy bueno", category: "Ropa", imageUrl: CLOTHES[4], price: 20.0, latitude: user2.latitude, longitude: user2.longitude, userId: user2.id },
    { title: "Pantalon palazzo beige", size: "M", brand: "Mango", condition: "Nuevo", category: "Ropa", imageUrl: CLOTHES[6], latitude: user3.latitude, longitude: user3.longitude, userId: user3.id },
    { title: "Sweater tejido camel", size: "L", brand: "Zara", condition: "Muy bueno", category: "Ropa", imageUrl: CLOTHES[7], latitude: user3.latitude, longitude: user3.longitude, userId: user3.id },
    { title: "Zapatillas blancas", size: "38", brand: "Adidas", condition: "Bueno", category: "Calzado", imageUrl: CLOTHES[8], price: 30.0, latitude: user3.latitude, longitude: user3.longitude, userId: user3.id },
  ]});

  await prisma.swipe.createMany({ data: [
    { swiperId: user2.id, targetItemId: demoItem1.id, type: "LIKE" },
    { swiperId: user1.id, targetItemId: demoItem1.id, type: "LIKE" },
  ]});

  const preMatch = await prisma.match.create({ data: { userAId: demo.id, userBId: user1.id } });
  await prisma.message.createMany({ data: [
    { matchId: preMatch.id, senderId: user1.id, text: "Hola! Me encantó tu chaqueta" },
    { matchId: preMatch.id, senderId: demo.id, text: "Gracias! La tuya también. ¿Cómo coordinamos?" },
  ]});

  return NextResponse.json({ ok: true, message: "Seed completado", login: "demo@ropinder.com / password123" });
}

export async function GET() {
  const count = await prisma.clothingItem.count();
  return NextResponse.json({ items: count, seeded: count > 0 });
}
