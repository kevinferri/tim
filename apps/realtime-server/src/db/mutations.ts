import { v4 } from "uuid";
import { Highlight, Message, TopicHistory } from "@tim/db-types";
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

type ToggleHighlightArgs = Pick<Highlight, "userId"> & { messageId: string };

type TopicHistoryArgs = Pick<TopicHistory, "userId" | "topicId">;

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

export async function saveTopicHistory({ userId, topicId }: TopicHistoryArgs) {
  await pgClient<TopicHistory>("topic_histories")
    .where("userId", userId)
    .where("topicId", topicId)
    .del();

  const history = await pgClient<TopicHistory>("topic_histories")
    .insert({
      id: v4(),
      topicId,
      userId,
    })
    .returning(["id"]);

  return history;
}
