import { Circle, Topic } from "@tim/db-types";
import { pgClient } from "./client";

// isUserInTopic/isUserInCircle duplicate the membership check in
// apps/chat/src/lib/prisma/circle-model.ts's `isUserInCirle` (Prisma
// nested-where vs. a raw join-table query here). If circle-membership
// semantics ever change in schema.prisma, update both.
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
  return await pgClient<Circle>("circles")
    .join("topics", "circles.id", "=", "topics.circleId")
    .select("circles.id")
    .where("topics.id", topicId)
    .first();
}

export async function getTopicIdsForCircle({ circleId }: { circleId: string }) {
  return await pgClient<Topic>("topics")
    .select("topics.id")
    .where("topics.circleId", circleId);
}
