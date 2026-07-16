import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
const statements = [
  `ALTER TABLE "User" ADD COLUMN "emailVerified" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN "verified" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN "verifiedAt" DATETIME`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name")`,
  `CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SIGNUP',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "VerificationCode_email_purpose_idx" ON "VerificationCode"("email", "purpose")`,
  `CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Favorite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_itemId_key" ON "Favorite"("userId", "itemId")`,
  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 70).replace(/\n/g, " ") + "...");
  }
  // Existing users predate email verification — grandfather them in so nobody gets locked out.
  await client.execute(`UPDATE "User" SET "emailVerified" = 1 WHERE "emailVerified" = 0`);
  console.log("\nTurso features schema updated (additive).");
}

main().catch(console.error);
