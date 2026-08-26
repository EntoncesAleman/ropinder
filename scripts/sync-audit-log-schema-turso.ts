import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Additive only — safe to run against a database with existing data.
const statements = [
  `CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt")`,
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
  console.log("\nTurso AdminAuditLog schema updated (additive).");
}

main().catch(console.error);
