import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
// Also includes the Config table from the earlier commission-engine cycle,
// which hadn't been synced to Turso yet.
const statements = [
  `CREATE TABLE IF NOT EXISTS "Config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Config_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ChatCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ChatCategory_key_key" ON "ChatCategory"("key")`,
  `CREATE TABLE IF NOT EXISTS "ChatQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ChatCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ChatAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ChatAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ChatQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `ALTER TABLE "Message" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'FREE'`,
  `ALTER TABLE "Message" ADD COLUMN "questionId" TEXT`,
  `ALTER TABLE "Message" ADD COLUMN "answerId" TEXT`,
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
  console.log("\nTurso Config/Chat schema updated (additive).");
}

main().catch(console.error);
