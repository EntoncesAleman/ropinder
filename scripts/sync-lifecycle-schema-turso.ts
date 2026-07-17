import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `ALTER TABLE "ClothingItem" ADD COLUMN "archived" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "soldAt" DATETIME`,
  `ALTER TABLE "ClothingItem" ADD COLUMN "expiresAt" DATETIME`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql);
  }
  console.log("\nTurso lifecycle schema updated (additive).");
}

main().catch(console.error);
