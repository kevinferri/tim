import { DashboardLayout } from "@/components/layouts/dashboard/dashboard-layout";
import { prismaClient } from "@/lib/prisma/client";
import { TopicHeader } from "@/topics/topic-header";
import { TopicChat } from "@/topics/topic-chat";
import { TopicMessageBar } from "@/topics/topic-message-bar";
import { NotFound } from "@/components/ui/not-found";
import { decrypt } from "@/lib/decryption";

function getReadableMessage(text?: string | null) {
  if (!text) return undefined;

  try {
    return decrypt(text);
  } catch {
    return "";
  }
}

export default async function TopicsPage({
  params,
}: {
  params: { id: string };
}) {
  const topic = await prismaClient.topic.getMeTopicById({
    topicId: params.id,
    select: {
      id: true,
      name: true,
      circleId: true,
    },
  });

  const messages = await prismaClient.message.findMany({
    where: {
      topicId: topic?.id,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      sentBy: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  const messagesForTopic = messages.map((message) => {
    return {
      ...message,
      text: getReadableMessage(message.text),
    };
  });

  return (
    <DashboardLayout circleId={topic?.circleId} topicId={topic?.id}>
      {topic ? (
        <>
          <TopicHeader name={topic.name} />
          <TopicChat topicId={topic.id} prevMessages={messagesForTopic} />
          <TopicMessageBar topicId={topic.id} />
        </>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </DashboardLayout>
  );
}
