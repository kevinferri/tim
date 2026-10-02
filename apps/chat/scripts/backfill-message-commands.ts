// One-off: fills Message.command for messages sent before the column existed.
// Idempotent -- only touches rows where command is still null -- so it's safe to rerun.
//
//   pnpm backfill:commands --dry-run   # report counts, write nothing
//   pnpm backfill:commands
//
// Needs DATABASE_URL and CRYPTO_KEY (locally: prefix with `npx dotenv -e .env.local --`).
import { PrismaClient } from "@prisma/client";
import { decrypt, DecryptionError } from "@tim/crypto";
import { parseCommand } from "@tim/commands";

const BATCH_SIZE = 500;
const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
  const totals: Record<string, number> = {};
  let scanned = 0;
  let undecryptable = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.message.findMany({
      where: { command: null, text: { not: null } },
      select: { id: true, text: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    const idsByCommand: Record<string, string[]> = {};
    for (const row of rows) {
      let text: string;
      try {
        text = decrypt(row.text!, row.id);
      } catch (err) {
        if (!(err instanceof DecryptionError)) throw err;
        undecryptable++;
        continue;
      }
      const command = parseCommand(text)?.name;
      if (command) (idsByCommand[command] ??= []).push(row.id);
    }

    for (const [command, ids] of Object.entries(idsByCommand)) {
      totals[command] = (totals[command] ?? 0) + ids.length;
      if (!dryRun) {
        await prisma.message.updateMany({
          where: { id: { in: ids } },
          data: { command },
        });
      }
    }

    console.log(`scanned ${scanned}...`);
  }

  console.log(dryRun ? "Dry run -- nothing written." : "Done.");
  console.log({ scanned, undecryptable, commands: totals });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
