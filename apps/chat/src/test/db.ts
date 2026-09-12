import { prismaClient } from "@/lib/prisma/client";

export { prismaClient };

// Truncates every table in the public schema so each integration test starts from a clean database.
export async function resetDb() {
  const tables: { tablename: string }[] = await prismaClient.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  if (tables.length === 0) return;

  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prismaClient.$executeRawUnsafe(
    `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`
  );
}
