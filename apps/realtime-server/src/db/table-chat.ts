import { TableChatLine as TableChatRow, User } from "@tim/db-types";
import { TABLE_CHAT_KEPT, TableChatSay, TableRef } from "@tim/casino";
import { decrypt, encrypt } from "../lib/encryption";
import { pgClient } from "./client";

const LIFETIME_MS = 24 * 60 * 60 * 1000;
// Expired rows are never read, so deleting them can wait; at most this often per process.
const SWEEP_EVERY_MS = 10 * 60 * 1000;
let lastSweep = 0;

const cutoff = () => new Date(Date.now() - LIFETIME_MS);

export async function addTableChatLine(
  { circleId, game }: TableRef,
  line: TableChatSay,
) {
  await pgClient<TableChatRow>("table_chat_lines").insert({
    id: line.id,
    circleId,
    game,
    userId: line.userId,
    text: encrypt(line.text, line.id),
  });
  if (Date.now() - lastSweep > SWEEP_EVERY_MS) {
    lastSweep = Date.now();
    // Not awaited, so the per-table write chain (and the loads behind it) never wait on it.
    pgClient("table_chat_lines")
      .where("createdAt", "<", cutoff())
      .del()
      .catch((err) => console.error("casino: table chat sweep failed", err));
  }
}

/** What was said at the table in the last day, oldest first, up to TABLE_CHAT_KEPT lines. */
export async function recentTableChatLines({
  circleId,
  game,
}: TableRef): Promise<TableChatSay[]> {
  const rows = (
    await pgClient<TableChatRow>("table_chat_lines")
      .where({ circleId, game })
      .where("createdAt", ">", cutoff())
      .orderBy("createdAt", "desc")
      .limit(TABLE_CHAT_KEPT)
  ).reverse();

  // Names and avatars as they are now, not when the line was said.
  const users = await pgClient<User>("users")
    .whereIn("id", [...new Set(rows.map((r) => r.userId))])
    .select("id", "name", "displayName", "imageUrl");
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.flatMap((row): TableChatSay[] => {
    const user = byId.get(row.userId);
    if (!user) return [];
    return [
      {
        id: row.id,
        kind: "say",
        userId: user.id,
        name: user.name,
        displayName: user.displayName,
        imageUrl: user.imageUrl,
        text: decrypt(row.text, row.id),
      },
    ];
  });
}
