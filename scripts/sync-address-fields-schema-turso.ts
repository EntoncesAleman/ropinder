import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `ALTER TABLE "User" ADD COLUMN "phoneVerified" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN "crossStreets" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "User" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT ''`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql);
  }
  console.log("\nTurso address-fields schema updated (additive).");
}

main().catch(console.error);
