import { TopicReadState } from "@tim/db-types";
import { pgClient } from "./client";

type TopicReadStateArgs = Pick<TopicReadState, "userId" | "topicId">;

const FOREIGN_KEY_VIOLATION = "23503";

// Returns false when the topic (or user) no longer exists, since there's nothing left to mark. lastReadAt comes from the DB clock so it compares cleanly against messages.createdAt (also DB-assigned).
export async function markTopicRead({
  userId,
  topicId,
}: TopicReadStateArgs): Promise<boolean> {
  try {
    await pgClient<TopicReadState>("topic_read_states")
      .insert({ topicId, userId, lastReadAt: pgClient.fn.now() })
      .onConflict(["userId", "topicId"])
      .merge({ lastReadAt: pgClient.fn.now() });

    return true;
  } catch (err) {
    if ((err as { code?: string }).code === FOREIGN_KEY_VIOLATION) {
      return false;
    }

    throw err;
  }
}
