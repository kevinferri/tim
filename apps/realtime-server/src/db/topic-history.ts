import { v4 } from "uuid";
import { TopicHistory } from "@tim/db-types";
import { pgClient } from "./client";

type TopicHistoryArgs = Pick<TopicHistory, "userId" | "topicId">;

export async function saveTopicHistory({ userId, topicId }: TopicHistoryArgs) {
  // A single upsert instead of delete-then-insert: the latter was two
  // round trips (and, absent a unique constraint, a race where concurrent
  // saves for the same userId/topicId could both pass the delete and both
  // insert, leaving duplicate rows). updatedAt is set explicitly since
  // Prisma's @updatedAt is enforced by Prisma Client, not the database --
  // a plain SQL/Knex write has to maintain it itself.
  const history = await pgClient<TopicHistory>("topic_histories")
    .insert({
      id: v4(),
      topicId,
      userId,
      updatedAt: new Date(),
    })
    .onConflict(["userId", "topicId"])
    .merge(["updatedAt"])
    .returning(["id"]);

  return history;
}
