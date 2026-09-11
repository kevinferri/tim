/**
 * One-shot migration: re-encrypts every messages.text row from the old
 * fixed-IV AES-192-CBC scheme to the new AES-256-GCM scheme in
 * packages/crypto (random IV per row, auth tag, AAD = messageId).
 *
 * Usage (run from apps/realtime-server):
 *   env $(cat .env.local) npx ts-node scripts/migrate-encryption.ts             # dry run (default)
 *   env $(cat .env.local) npx ts-node scripts/migrate-encryption.ts --apply     # writes for real
 *
 * Dry run decrypts every row with the old scheme, re-encrypts with the new
 * scheme, then decrypts that again and checks it matches -- no writes.
 * Confirm 0 failures on a dry run before ever passing --apply.
 *
 * Requires CRYPTO_ALGORITHM/CRYPTO_SECRET/CRYPTO_IV (old scheme, to read
 * existing rows) AND CRYPTO_KEY (new scheme, to write new ones) to all be
 * set -- keep the old three vars around only until this script has been
 * run for real against production.
 *
 * Back up the messages table before running with --apply, e.g.:
 *   pg_dump "$DATABASE_URL" -t messages -Fc -f messages-backup-$(date +%s).dump
 */

import crypto from "crypto";
import { encrypt as encryptV2, decrypt as decryptV2 } from "@tim/crypto";
import { pgClient } from "../src/db/client";

const BATCH_SIZE = 500;

function loadLegacyKeyMaterial() {
  const algorithm = process.env.CRYPTO_ALGORITHM;
  const secret = process.env.CRYPTO_SECRET;
  const ivRaw = process.env.CRYPTO_IV;

  if (!algorithm || !secret || !ivRaw) {
    throw new Error(
      "CRYPTO_ALGORITHM/CRYPTO_SECRET/CRYPTO_IV must be set to decrypt legacy rows"
    );
  }

  // scryptSync is deliberately slow (~15-20ms/call) -- derive the key once
  // up front, not per row. At tens of thousands of rows, doing this inside
  // the per-row loop would turn a few-second migration into tens of minutes
  // of pure key-derivation overhead for no benefit (same secret every time).
  return {
    algorithm,
    key: crypto.scryptSync(secret, "salt", 24),
    iv: Buffer.from(ivRaw, "utf8"),
  };
}

const legacy = loadLegacyKeyMaterial();

function decryptLegacy(encrypted: string): string {
  const decipher = crypto.createDecipheriv(legacy.algorithm, legacy.key, legacy.iv);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}

type Row = { id: string; text: string | null };

async function* pageMessages() {
  let cursor: string | undefined;

  while (true) {
    const query = pgClient<Row>("messages")
      .select("id", "text")
      .orderBy("id", "asc")
      .limit(BATCH_SIZE);

    const rows = await (cursor ? query.where("id", ">", cursor) : query);
    if (rows.length === 0) return;

    yield rows;
    cursor = rows[rows.length - 1].id;
  }
}

// Writes every re-encrypted row in the batch with one multi-row UPDATE
// instead of one round trip per row -- at tens of thousands of rows,
// per-row UPDATEs would dominate the run time with pure network/pooler
// latency for no benefit.
async function applyBatch(pairs: { id: string; text: string }[]) {
  if (pairs.length === 0) return;

  // messages.id is a Prisma String @id @default(uuid()) -- stored as
  // Postgres text, not the native uuid type, so both columns cast to text.
  const placeholders = pairs.map(() => "(?::text, ?::text)").join(", ");
  const bindings = pairs.flatMap((p) => [p.id, p.text]);

  await pgClient.raw(
    `UPDATE messages AS m SET text = v.text FROM (VALUES ${placeholders}) AS v(id, text) WHERE m.id = v.id`,
    bindings
  );
}

async function run(apply: boolean) {
  let total = 0;
  let migrated = 0;
  let skippedNullText = 0;
  let failed = 0;

  for await (const rows of pageMessages()) {
    const toApply: { id: string; text: string }[] = [];

    for (const row of rows) {
      total++;

      if (!row.text) {
        skippedNullText++;
        continue;
      }

      try {
        const plaintext = decryptLegacy(row.text);
        const reencrypted = encryptV2(plaintext, row.id);
        const verified = decryptV2(reencrypted, row.id);

        if (verified !== plaintext) {
          throw new Error("round-trip mismatch after re-encryption");
        }

        migrated++;
        if (apply) toApply.push({ id: row.id, text: reencrypted });
      } catch (err) {
        failed++;
        console.error(`[migrate-encryption] row ${row.id} failed:`, err);
      }
    }

    if (apply) {
      await applyBatch(toApply);
    }

    console.log(
      `[migrate-encryption] progress: ${total} seen, ${migrated} ${apply ? "migrated" : "verified"}, ${failed} failed, ${skippedNullText} null-text skipped`
    );
  }

  console.log(
    `[migrate-encryption] done: ${total} seen, ${migrated} ${apply ? "migrated" : "verified"}, ${failed} failed, ${skippedNullText} null-text skipped.`
  );

  if (failed > 0) {
    console.error(
      `[migrate-encryption] ${failed} row(s) failed -- do not run with --apply until a dry run reports 0 failures.`
    );
    process.exitCode = 1;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (apply) {
    console.log(
      "[migrate-encryption] running with --apply: this WILL overwrite messages.text. " +
        "Confirm the messages table is backed up and a dry run reported 0 failures first."
    );
  } else {
    console.log(
      "[migrate-encryption] dry run: decrypt -> re-encrypt -> decrypt-again verify, no writes."
    );
  }

  await run(apply);
}

main()
  .catch((err) => {
    console.error("[migrate-encryption] fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.destroy());
