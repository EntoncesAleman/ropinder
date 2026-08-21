import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `ALTER TABLE "User" ADD COLUMN "stylePrefs" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "User" ADD COLUMN "brandPrefs" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "User" ADD COLUMN "lastSeenAt" DATETIME`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "style" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME
  )`,
  `CREATE INDEX IF NOT EXISTS "Offer_itemId_buyerId_idx" ON "Offer"("itemId", "buyerId")`,
  `CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Question_itemId_createdAt_idx" ON "Question"("itemId", "createdAt")`,
];

async function main() {
  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log("OK:", sql.slice(0, 70));
    } catch (e) {
      // ALTER TABLE ADD COLUMN fails if the column already exists — safe to skip on re-run.
      console.log("SKIP (probably already applied):", sql.slice(0, 70), (e as Error).message);
    }
  }
  console.log("\nTurso schema updated (additive) — style/brand prefs, view counts, Offer, Question.");
}

main().catch(console.error);
