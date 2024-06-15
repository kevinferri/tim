import { v4 } from "uuid";
import { encrypt } from "../lib/encryption";

type WriteMessageArgs = {
  userId: string;
  topicId: string;
  text: string;
  mediaUrl: string;
};

type DeleteMessageArgs = {
  userId: string;
  messageId: string;
};

type EditMessageArgs = {
  userId: string;
  messageId: string;
  text: string;
  mediaUrl?: string;
};

type ToggleHighlightArgs = {
  userId: string;
  messageId: string;
};

export async function writeMessage({
  userId,
  topicId,
  text,
  mediaUrl,
}: WriteMessageArgs) {
  const message = await pgClient("messages")
    .insert({
      id: v4(),
      text: encrypt(text),
      mediaUrl,
      userId,
      topicId,
    })
    .returning(["id", "text", "topicId", "mediaUrl"]);

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

export async function deleteMessage({ userId, messageId }: DeleteMessageArgs) {
  const message = await pgClient("messages")
    .where("id", messageId)
    .where("userId", userId)
    .del()
    .returning("id");

  return message[0];
}

export async function editMessage({
  userId,
  messageId,
  text,
  mediaUrl,
}: EditMessageArgs) {
  const message = await pgClient("messages")
    .where("id", messageId)
    .where("userId", userId)
    .update(
      {
        text: encrypt(text),
        mediaUrl,
      },
      ["id", "text", "mediaUrl"]
    );

  return message[0];
}
