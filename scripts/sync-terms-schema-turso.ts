import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  await client.execute(`ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" DATETIME`);
  console.log("OK: termsAcceptedAt column added (additive).");
}

main().catch(console.error);
