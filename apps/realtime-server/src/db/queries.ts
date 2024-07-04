import { pgClient } from "./client";

export async function isUserInTopic({
  userId,
  topicId,
}: {
  userId: string;
  topicId: string;
}) {
  const topic = await pgClient("topics")
    .select("id", "circleId")
    .where("id", topicId)
    .first();

  if (!topic) return false;

  return await isUserInCircle({ userId, circleId: topic.circleId });
}

export async function isUserInCircle({
  userId,
  circleId,
}: {
  userId: string;
  circleId: string;
}) {
  const circle = await pgClient("_circleMembershipsForUser")
    .select("A", "B")
    .where("A", circleId)
    .where("B", userId)
    .first();

  return Boolean(circle);
}

export async function getParentCircleIdForTopic({
  topicId,
}: {
  topicId: string;
}) {
  return await pgClient("circles")
    .join("topics", "circles.id", "=", "topics.circleId")
    .select("circles.id")
    .where("topics.id", topicId)
    .first();
}

export async function getTopicIdsForCircle({ circleId }: { circleId: string }) {
  return await pgClient("topics")
    .select("topics.id")
    .where("topics.circleId", circleId);
}

export async function getMembersForCircle({ circleId }: { circleId: string }) {
  return await pgClient("_circleMembershipsForUser").where("A", circleId);
}

export async function getAllCirclesForUser({ userId }: { userId: string }) {
  // todo
}
