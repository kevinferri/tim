import { prismaClient } from "@/lib/prisma/client";
import { TopicsList } from "@/components/topics/topics-list";
import { Message, Topic, TopicHistory } from "@prisma/client";
import { WithRelation } from "../../../types/prisma";
import { getLoggedInUserId } from "@/lib/session";
import keyBy from "lodash.keyby";

type Props = {
  circleId: string;
};

export async function TopicsNav({ circleId }: Props) {
  const userId = await getLoggedInUserId();

  const queries = [
    prismaClient.topic.getMeAllTopicsForCircle({
      circleId,
      select: {
        name: true,
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prismaClient.circle.getMeCircleById({
      circleId,
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        imageUrl: true,
        defaultTopicId: true,
        members: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),

    // See if there is a way to just get histories for current circle
    prismaClient.topicHistory.findMany({
      where: {
        userId,
      },
      select: {
        updatedAt: true,
        topicId: true,
      },
    }),

    prismaClient.$queryRaw`
      SELECT DISTINCT "topicId", "createdAt"
      FROM "public"."messages"
      ORDER BY "createdAt" DESC;
    `,
  ];

  const [topics, parentCircle, histories, recentMessageByTopic] =
    await Promise.all(queries);

  // @ts-expect-error
  const historyMap: Record<string, TopicHistory> = keyBy(histories, "topicId");

  const unreadTopicIds = (recentMessageByTopic as Message[]).reduce(
    (acc, { createdAt, topicId }) => {
      const history = historyMap[topicId];

      if (history && new Date(history.updatedAt) < new Date(createdAt)) {
        return {
          ...acc,
          [topicId]: true,
        };
      }

      return acc;
    },
    {}
  );

  if (parentCircle) {
    return (
      <TopicsList
        topics={topics as Topic[]}
        unreadTopicIds={unreadTopicIds}
        circle={parentCircle as WithRelation<"Circle", "members">}
      />
    );
  }

  return null;
}
