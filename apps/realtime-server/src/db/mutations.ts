import { v4 } from "uuid";
import { encrypt } from "./encryption";

type WriteMessageArgs = {
  userId: string;
  topicId: string;
  text: string;
};

type DeleteMessageArgs = {
  userId: string;
  topicId: string;
  messageId: string;
};

type ToggleHighlightArgs = {
  userId: string;
  messageId: string;
};

export async function writeMessage({
  userId,
  topicId,
  text,
}: WriteMessageArgs) {
  const message = await pgClient("messages")
    .insert({
      id: v4(),
      text: encrypt(text),
      userId,
      topicId,
    })
    .returning(["id", "text", "topicId"]);

  return message[0];
}

async function writeHighlight({ userId, messageId }: ToggleHighlightArgs) {
  const highlight = await pgClient("highlights")
    .insert({
      id: v4(),
      userId,
      messageId,
    })
    .returning(["id", "messageId", "userId"]);

  return highlight[0];
}

async function deleteHighlight({ userId, messageId }: ToggleHighlightArgs) {
  await pgClient("highlights")
    .where("userId", userId)
    .where("messageId", messageId)
    .del();

  return undefined;
}

export async function toggleHighlight({
  userId,
  messageId,
}: ToggleHighlightArgs) {
  const existingHighlight = await pgClient("highlights")
    .select("id")
    .where("userId", userId)
    .where("messageId", messageId)
    .first();

  if (existingHighlight) {
    return await deleteHighlight({ userId, messageId });
  }

  return await writeHighlight({ userId, messageId });
}

export async function deleteMessage({
  userId,
  messageId,
  topicId,
}: DeleteMessageArgs) {
  const message = await pgClient("messages")
    .where("id", messageId)
    .where("userId", userId)
    .where("topicId", topicId)
    .del()
    .returning("id");

  return message[0];
}
