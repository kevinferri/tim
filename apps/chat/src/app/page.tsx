import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const userId = await getLoggedInUserId();
  const mostRecentTopic = await prismaClient.topicHistory.getMostRecentForUser(
    { userId }
  );

  const isStillInCircle = mostRecentTopic?.topic.parentCircle.members.find(
    ({ id }) => id === userId
  );

  if (mostRecentTopic && !isStillInCircle) {
    prismaClient.topicHistory.deleteForTopicAndUser({
      topicId: mostRecentTopic.topicId,
      userId,
    });
  }

  // Server redirect (not a client component redirecting on mount) so we go straight to the target route's real loading.tsx instead of showing a bespoke skeleton first and then a second, different-looking one.
  if (mostRecentTopic) {
    redirect(
      `/circles/${mostRecentTopic.topic.circleId}/topics/${mostRecentTopic.topicId}`
    );
  }

  return (
    <div className="flex basis-full justify-center items-center">
      Welcome to Tim
    </div>
  );
}
