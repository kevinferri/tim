import { v4 } from "uuid";
import { TopicHistory } from "@tim/db-types";
import { pgClient } from "./client";

type TopicHistoryArgs = Pick<TopicHistory, "userId" | "topicId">;

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
