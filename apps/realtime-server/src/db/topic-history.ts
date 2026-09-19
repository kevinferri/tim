import { v4 } from "uuid";
import { TopicHistory } from "@tim/db-types";
import { pgClient } from "./client";

type TopicHistoryArgs = Pick<TopicHistory, "userId" | "topicId">;

export async function saveTopicHistory({ userId, topicId }: TopicHistoryArgs) {
  // A single upsert avoids the race of a delete-then-insert. updatedAt is set explicitly (Prisma's @updatedAt is enforced by Prisma Client, not the DB), from the DB clock so it compares cleanly against messages.createdAt.
  const history = await pgClient<TopicHistory>("topic_histories")
    .insert({
      id: v4(),
      topicId,
      userId,
      updatedAt: pgClient.fn.now(),
    })
    .onConflict(["userId", "topicId"])
    .merge({ updatedAt: pgClient.fn.now() })
    .returning(["id"]);

  return history;
}
