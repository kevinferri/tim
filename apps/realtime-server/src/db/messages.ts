import { v4 } from "uuid";
import { Message } from "@tim/db-types";
import { encrypt } from "../lib/encryption";
import { pgClient } from "./client";

type WriteMessageArgs = Pick<
  Message,
  "userId" | "topicId" | "text" | "mediaUrl"
> & { replyToId?: string; threadRootId?: string };

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
  replyToId,
  threadRootId,
}: WriteMessageArgs) {
  const id = v4();
  let createdAt = new Date();

  // Clock skew / future-dated seed parents can otherwise produce replies that
  // sort *above* their parent after refresh (live socket appends at the bottom).
  if (replyToId) {
    const parent = await pgClient<Message>("messages")
      .select("createdAt")
      .where("id", replyToId)
      .first();
    if (parent?.createdAt) {
      const minCreatedAt = new Date(
        new Date(parent.createdAt).getTime() + 1,
      );
      if (createdAt < minCreatedAt) createdAt = minCreatedAt;
    }
  }

  const message = await pgClient<Message>("messages")
    .insert({
      id,
      text: encrypt(text, id),
      mediaUrl,
      userId,
      topicId,
      replyToId,
      threadRootId,
      createdAt,
    })
    .returning([
      "id",
      "text",
      "topicId",
      "mediaUrl",
      "replyToId",
      "threadRootId",
      "createdAt",
    ]);

  return message[0];
}

// Scoped to topicId so it doubles as validation: a replyToId for a message
// in another topic (stale, tampered, or the two just don't match) comes
// back undefined rather than leaking cross-topic content into the preview.
export async function getMessageForReplyPreview({
  messageId,
  topicId,
}: {
  messageId: string;
  topicId: string;
}) {
  return await pgClient<Message>("messages")
    .select(
      "messages.id",
      "messages.text",
      "messages.userId",
      "messages.threadRootId",
      "users.name",
    )
    .join("users", "messages.userId", "users.id")
    .where("messages.id", messageId)
    .where("messages.topicId", topicId)
    .first();
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
  // createdAt is only millisecond precision and ties are possible for rapid-fire messages, so break ties with ctid (physical insertion order) for a stable ordering.
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
      ["id", "text", "mediaUrl"],
    );

  return message[0];
}
