import { prismaClient } from "@/lib/prisma/client";
import { TopicsList } from "@/components/topics/topics-list";

type Props = {
  circleId: string;
};

export async function TopicsNav({ circleId }: Props) {
  // TODO: use promise.all here
  const parentCircle = await prismaClient.circle.getMeCircleById({
    circleId,
    select: {
      id: true,
      name: true,
      description: true,
      userId: true,
      imageUrl: true,
      members: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const topics = await prismaClient.topic.getMeAllTopicsForCircle({
    circleId,
    select: {
      name: true,
      id: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (parentCircle) {
    return <TopicsList topics={topics} circle={parentCircle} />;
  }

  return null;
}
