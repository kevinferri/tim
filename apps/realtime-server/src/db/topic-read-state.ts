import { TopicReadState } from "@tim/db-types";
import { pgClient } from "./client";

type TopicReadStateArgs = Pick<TopicReadState, "userId" | "topicId">;

// lastReadAt comes from the DB clock so it compares cleanly against messages.createdAt (also DB-assigned).
export async function markTopicRead({ userId, topicId }: TopicReadStateArgs) {
  await pgClient<TopicReadState>("topic_read_states")
    .insert({ topicId, userId, lastReadAt: pgClient.fn.now() })
    .onConflict(["userId", "topicId"])
    .merge({ lastReadAt: pgClient.fn.now() });
}
