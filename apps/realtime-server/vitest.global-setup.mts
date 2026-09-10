// Reuses apps/chat's embedded-postgres test instance and schema (chat's
// schema.prisma is the single source of truth for both apps -- see root
// CLAUDE.md). This is the same instance apps/chat's own test suite uses;
// ensureTestDb() is idempotent so running both suites is safe.
import { ensureTestDb } from "../chat/scripts/test-db.js";

export default async function setup() {
  const databaseUrl = await ensureTestDb();
  process.env.DATABASE_URL = databaseUrl;
}
