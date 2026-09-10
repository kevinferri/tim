import { v4 } from "uuid";
import { Message } from "@tim/db-types";
import { encrypt } from "../lib/encryption";
import { pgClient } from "./client";

type WriteMessageArgs = Pick<
  Message,
  "userId" | "topicId" | "text" | "mediaUrl"
>;

type DeleteMessageArgs = Pick<Message, "userId"> & { messageId: string };

type EditMessageArgs = Pick<Message, "userId" | "text"> & {
  messageId: string;
  mediaUrl?: string;
};

export async function writeMessage({
  userId,
  topicId,
  text,
  mediaUrl,
}: WriteMessageArgs) {
  const message = await pgClient<Message>("messages")
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

export async function getMessageForUser({
  messageId,
  userId,
}: {
  messageId: string;
  userId: string;
}) {
  return await pgClient<Message>("messages")
    .select("id", "text")
    .where("id", messageId)
    .where("userId", userId)
    .first();
}

export async function getMessageOwnerInTopic({
  messageId,
  topicId,
}: {
  messageId: string;
  topicId: string;
}) {
  return await pgClient<Message>("messages")
    .select("messages.id", "messages.userId")
    .where("messages.id", messageId)
    .where("messages.topicId", topicId)
    .first();
}

export async function getMessageHistoryForTopic({
  topicId,
  limit,
}: {
  topicId: string;
  limit: number;
}) {
  const rows: { text: string; mediaUrl: string; name: string }[] =
    await pgClient("messages")
      .select("messages.text", "messages.mediaUrl", "users.name")
      .join("users", "messages.userId", "users.id")
      .where("messages.topicId", topicId)
      .orderBy("messages.createdAt", "desc")
      .limit(limit);

  return rows.reverse();
}

export async function deleteMessage({ userId, messageId }: DeleteMessageArgs) {
  const message = await pgClient<Message>("messages")
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
  const message = await pgClient<Message>("messages")
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
