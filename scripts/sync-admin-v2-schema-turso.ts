import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `ALTER TABLE "User" ADD COLUMN "premiumPlan" TEXT`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "isAd" INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS "PushToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PushToken_token_key" ON "PushToken"("token")`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60).replace(/\n/g, " ") + "...");
  }
  console.log("\nTurso admin-v2 schema updated (additive).");
}

main().catch(console.error);
