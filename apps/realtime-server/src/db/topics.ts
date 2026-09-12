import { Circle, Topic } from "@tim/db-types";
import { pgClient } from "./client";
import { isUserInCircle } from "./circles";

export async function isUserInTopic({
  userId,
  topicId,
}: {
  userId: string;
  topicId: string;
}) {
  const topic = await pgClient<Topic>("topics")
    .select("id", "circleId")
    .where("id", topicId)
    .first();

  if (!topic) return false;

  return await isUserInCircle({ userId, circleId: topic.circleId });
}

export async function getParentCircleIdForTopic({
  topicId,
}: {
  topicId: string;
}) {
  return await pgClient<Circle>("circles")
    .join("topics", "circles.id", "=", "topics.circleId")
    .select("circles.id")
    .where("topics.id", topicId)
    .first();
}

export async function getTopicSummary({ topicId }: { topicId: string }) {
  return await pgClient<Topic>("topics")
    .select("id", "name")
    .where("id", topicId)
    .first();
}
