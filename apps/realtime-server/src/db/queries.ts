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
