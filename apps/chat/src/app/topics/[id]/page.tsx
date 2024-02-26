import { DashboardLayout } from "@/components/layouts/dashboard/dashboard-layout";
import { prismaClient } from "@/lib/prisma/client";
import { TopicHeader } from "@/topics/topic-header";
import { TopicChat } from "@/topics/topic-chat";
import { TopicMessageBar } from "@/topics/topic-message-bar";
import { NotFound } from "@/components/ui/not-found";

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

  return (
    <DashboardLayout circleId={topic?.circleId} topicId={topic?.id}>
      {topic ? (
        <>
          <TopicHeader name={topic.name} />
          <TopicChat topicId={topic.id} />
          <TopicMessageBar topicId={topic.id} />
        </>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </DashboardLayout>
  );
}
