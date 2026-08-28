import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
// Loop 06 (Monetización): Store accounts, annual verified badge, VIP
// listings, multi-photo, saved searches.
const statements = [
  `ALTER TABLE "User" ADD COLUMN "verifiedUntil" DATETIME`,
  `ALTER TABLE "User" ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'PERSONAL'`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "isVip" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "vipAt" DATETIME`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "images" TEXT NOT NULL DEFAULT '[]'`,
  `CREATE TABLE IF NOT EXISTS "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "SavedSearch_userId_idx" ON "SavedSearch"("userId")`,
  // Backfill: every already-verified user gets 1 year from their original
  // verifiedAt so the annual-renewal rule applies uniformly, not just to
  // new purchases going forward.
  `UPDATE "User" SET "verifiedUntil" = datetime("verifiedAt", '+1 year') WHERE "verified" = 1 AND "verifiedAt" IS NOT NULL AND "verifiedUntil" IS NULL`,
  // Backfill: existing single-photo listings get a 1-element images array
  // matching their current cover so old rows read the same as new ones.
  `UPDATE "ClothingItem" SET "images" = '[' || '"' || replace("imageUrl", '"', '\\"') || '"' || ']' WHERE "images" = '[]'`,
];

async function main() {
  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log("OK:", sql.slice(0, 70).replace(/\s+/g, " ") + "...");
    } catch (e) {
      const msg = String(e);
      if (msg.includes("duplicate column name")) {
        console.log("SKIP (already exists):", sql.slice(0, 70).replace(/\s+/g, " ") + "...");
      } else {
        throw e;
      }
    }
  }
  console.log("\nTurso Loop 06 monetization schema updated (additive).");
}

main().catch(console.error);
