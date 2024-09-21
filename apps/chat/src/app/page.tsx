import { prismaClient } from "@/lib/prisma/client";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const mostRecentTopic = await prismaClient.topicHistory.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      topicId: true,
      topic: {
        select: {
          circleId: true,
        },
      },
    },
  });

  if (mostRecentTopic?.topicId && mostRecentTopic?.topic.circleId) {
    redirect(
      `/circles/${mostRecentTopic.topic.circleId}/topics/${mostRecentTopic?.topicId}`
    );
  }

  return (
    <div className="flex basis-full justify-center items-center">
      Welcome to Tim
    </div>
  );
}
