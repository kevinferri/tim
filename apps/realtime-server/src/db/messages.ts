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
  const id = v4();

  const message = await pgClient<Message>("messages")
    .insert({
      id,
      text: encrypt(text, id),
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
  // createdAt alone isn't a reliable order for rapid-fire messages -- it's
  // millisecond precision, and sequential inserts can land in the same
  // millisecond (ties observed even in this table's own test suite), which
  // leaves Postgres free to return them in either order. ctid (physical row
  // location) breaks the tie: it tracks insertion order for appended rows,
  // which is all this table does outside of in-place edits.
  const rows: { id: string; text: string; mediaUrl: string; name: string }[] =
    await pgClient("messages")
      .select("messages.id", "messages.text", "messages.mediaUrl", "users.name")
      .join("users", "messages.userId", "users.id")
      .where("messages.topicId", topicId)
      .orderBy("messages.createdAt", "desc")
      .orderBy("messages.ctid", "desc")
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
        text: encrypt(text, messageId),
        mediaUrl,
      },
      ["id", "text", "mediaUrl"]
    );

  return message[0];
}
