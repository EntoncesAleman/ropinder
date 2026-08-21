import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
// Lets an Offer represent a barter (offeredItemId set, amount 0) instead of
// only a money offer, and tracks when a barter was actually completed.
const statements = [
  `ALTER TABLE "Offer" ADD COLUMN "offeredItemId" TEXT`,
  `ALTER TABLE "Offer" ADD COLUMN "completedAt" DATETIME`,
];

async function main() {
  for (const sql of statements) {
    await client.execute(sql);
    console.log("OK:", sql);
  }
  console.log("\nTurso Offer schema updated (additive).");
}

main().catch(console.error);
