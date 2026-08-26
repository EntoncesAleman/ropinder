#!/bin/sh
# Integration tests run against a real, throwaway SQLite database (never
# dev.db, never Turso) so lib/*.ts modules that talk to prisma get exercised
# against an actual DB instead of only pure-logic unit tests. The temp file
# is created fresh and deleted on exit no matter how the tests finish.
set -e

DB_PATH="./tests/integration/.tmp-test.db"

cleanup() {
  rm -f "$DB_PATH" "$DB_PATH-journal"
}
trap cleanup EXIT

cleanup
npx prisma db push --url="file:$DB_PATH" --accept-data-loss

TURSO_DATABASE_URL="file:$DB_PATH" TURSO_AUTH_TOKEN="" \
  npx tsx --test --test-concurrency=1 tests/integration/*.test.ts
