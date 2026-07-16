import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
const statements = [
  `ALTER TABLE "Transaction" ADD COLUMN "availableAt" DATETIME`,
  `ALTER TABLE "Transaction" ADD COLUMN "withdrawnAt" DATETIME`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql);
  }
  console.log("\nTurso Transaction schema updated (additive).");
}

main().catch(console.error);
