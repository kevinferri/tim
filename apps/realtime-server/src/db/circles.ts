import { Topic } from "@tim/db-types";
import { pgClient } from "./client";

// Duplicates the membership check in
// apps/chat/src/lib/prisma/circle-model.ts's `isUserInCirle` (a raw
// join-table query here vs. Prisma nested-where there). If circle-membership
// semantics ever change in schema.prisma, update both.
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

export async function getTopicIdsForCircle({ circleId }: { circleId: string }) {
  return await pgClient<Topic>("topics")
    .select("topics.id")
    .where("topics.circleId", circleId);
}

export async function getCircleMembers({ circleId }: { circleId: string }) {
  const members: { id: string; name: string }[] = await pgClient(
    "_circleMembershipsForUser"
  )
    .select("users.id", "users.name")
    .where("_circleMembershipsForUser.A", circleId)
    .join("users", "_circleMembershipsForUser.B", "users.id");

  return members;
}
