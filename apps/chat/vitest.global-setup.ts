import { ensureTestDb } from "./scripts/test-db.js";

export default async function setup() {
  const databaseUrl = await ensureTestDb();
  process.env.DATABASE_URL = databaseUrl;
}
