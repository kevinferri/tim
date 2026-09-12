import { v4 } from "uuid";
import { Highlight } from "@tim/db-types";
import { pgClient } from "./client";

type ToggleHighlightArgs = Pick<Highlight, "userId"> & { messageId: string };

async function writeHighlight({ userId, messageId }: ToggleHighlightArgs) {
  // ON CONFLICT DO NOTHING makes this an atomic "insert iff absent" (empty array if already highlighted), avoiding a race or duplicate rows from a check-then-insert.
  const highlight = await pgClient<Highlight>("highlights")
    .insert({
      id: v4(),
      userId,
      messageId,
    })
    .onConflict(["userId", "messageId"])
    .ignore()
    .returning(["id", "messageId", "userId"]);

  return highlight[0];
}

async function deleteHighlight({ userId, messageId }: ToggleHighlightArgs) {
  await pgClient<Highlight>("highlights")
    .where("userId", userId)
    .where("messageId", messageId)
    .del();

  return undefined;
}

export async function toggleHighlight({
  userId,
  messageId,
}: ToggleHighlightArgs) {
  const inserted = await writeHighlight({ userId, messageId });

  if (inserted) return inserted;

  return await deleteHighlight({ userId, messageId });
}
