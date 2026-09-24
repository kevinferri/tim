import { v4 } from "uuid";
import { Notification } from "@tim/db-types";
import { pgClient } from "./client";

type CreateNotificationArgs = Pick<
  Notification,
  "type" | "recipientId" | "actorId" | "messageId"
>;

export async function createNotification({
  type,
  recipientId,
  actorId,
  messageId,
}: CreateNotificationArgs) {
  await pgClient<Notification>("notifications").insert({
    id: v4(),
    type,
    recipientId,
    actorId,
    messageId,
  });
}
