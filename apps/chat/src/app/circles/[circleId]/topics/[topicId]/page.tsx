import { cache } from "react";

import { prismaClient } from "@/lib/prisma/client";
import { TopicHeader } from "@/components/topics/topic-header";
import { TopicChat } from "@/components/topics/topic-chat";
import { TopicMessageBar } from "@/components/topics/topic-message-bar";
import { NotFound } from "@/components/ui/not-found";
import { TopicSideBar } from "@/components/topics/topic-side-bar";
import {
  DEFAULT_MESSAGE_SELECT,
  MESSAGE_LIMIT,
  TOP_HIGHLIGHTS_LIMIT,
} from "@/lib/prisma/message-model";
import { CurrentTopicProvider } from "@/components/topics/current-topic-provider";
import { DEFAULT_TITLE } from "@/layout";

type Props = {
  params: { topicId: string };
};

const getTopic = cache(async (id: string) => {
  const topic = await prismaClient.topic.getMeTopicById({
    topicId: id,
    select: {
      id: true,
      name: true,
      userId: true,
      description: true,
      parentCircle: {
        select: {
          id: true,
          name: true,
          defaultTopicId: true,
        },
      },
    },
  });

  return topic;
});

export async function generateMetadata({ params }: Props) {
  const topic = await getTopic(params.topicId);

  return {
    title: !topic
      ? DEFAULT_TITLE
      : `${topic.parentCircle.name} - ${topic.name}`,
  };
}

export default async function TopicPage({ params }: Props) {
  const topic = await getTopic(params.topicId);

  const queries = [
    prismaClient.message.getMessagesForTopic({
      topicId: topic?.id,
      select: DEFAULT_MESSAGE_SELECT,
    }),

    prismaClient.message.getTopHighlightedMessagesForTopic({
      topicId: topic?.id,
      select: DEFAULT_MESSAGE_SELECT,
    }),

    prismaClient.message.getMediaMessagesForTopic({
      topicId: topic?.id,
      select: DEFAULT_MESSAGE_SELECT,
    }),

    prismaClient.user.getMembersForCircle({
      circleId: topic?.parentCircle.id ?? "",
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        createdCircles: {
          select: {
            id: true,
          },
        },
      },
    }),
  ];

  const [messages, topHighlights, mediaMessages, circleMembers] =
    await Promise.all(queries);

  return (
    <div className="flex flex-col overflow-y-auto basis-full h-full">
      {topic ? (
        <CurrentTopicProvider
          topicId={topic.id}
          circleId={topic.parentCircle.id}
          messagesLimit={MESSAGE_LIMIT}
          topHighlightsLimit={TOP_HIGHLIGHTS_LIMIT}
          existingCircleMemebers={circleMembers}
          // @ts-expect-error
          existingMessages={messages}
          // @ts-expect-error
          existingTopHighlights={topHighlights}
          // @ts-expect-error
          existingMediaMessages={mediaMessages}
        >
          <TopicHeader topic={topic} />
          <div className="flex flex-1 flex-row overflow-y-hidden">
            <div className="flex flex-1 flex-col overflow-x-hidden">
              <TopicChat />
              <TopicMessageBar />
            </div>
            <div className="flex overflow-y-hidden">
              <TopicSideBar />
            </div>
          </div>
        </CurrentTopicProvider>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </div>
  );
}
