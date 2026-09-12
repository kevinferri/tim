import { pgClient } from "../db/client";

export { pgClient };

// Truncates every table in the public schema so each integration test
// starts from a clean database, regardless of what earlier tests inserted.
export async function resetDb() {
  const { rows } = await pgClient.raw(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );

  if (rows.length === 0) return;

  const names = rows
    .map((r: { tablename: string }) => `"${r.tablename}"`)
    .join(", ");
  await pgClient.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
