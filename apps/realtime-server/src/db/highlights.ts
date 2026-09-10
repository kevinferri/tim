import { v4 } from "uuid";
import { Highlight } from "@tim/db-types";
import { pgClient } from "./client";

type ToggleHighlightArgs = Pick<Highlight, "userId"> & { messageId: string };

async function writeHighlight({ userId, messageId }: ToggleHighlightArgs) {
  const highlight = await pgClient<Highlight>("highlights")
    .insert({
      id: v4(),
      userId,
      messageId,
    })
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
  const existingHighlight = await pgClient<Highlight>("highlights")
    .select("id")
    .where("userId", userId)
    .where("messageId", messageId)
    .first();

  if (existingHighlight) {
    return await deleteHighlight({ userId, messageId });
  }

  return await writeHighlight({ userId, messageId });
}
