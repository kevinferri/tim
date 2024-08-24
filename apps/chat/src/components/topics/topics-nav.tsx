import { prismaClient } from "@/lib/prisma/client";
import { UpsertTopicForm } from "@/components/topics/upsert-topic-form";
import { Button } from "@/components/ui/button";
import { GearIcon } from "@radix-ui/react-icons";
import { TopicsList } from "@/components/topics/topics-list";
import { UpsertCircleForm } from "@/components/circles/upsert-circle-form";

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

  return (
    <div className="flex flex-col shadow-md border-r max-w-[280px] min-w-[280px]">
      <div className="block p-3 border-b overflow-hidden whitespace-nowrap text-ellipsis font-medium">
        {parentCircle?.name}
      </div>

      <TopicsList
        topics={topics}
        circleName={parentCircle?.name}
        circleId={parentCircle?.id}
      />

      <div className="flex flex-col items-center mt-auto gap-3 p-3">
        <UpsertTopicForm circleId={circleId} circleName={parentCircle?.name} />
        <UpsertCircleForm
          existingCircle={parentCircle ?? undefined}
          trigger={
            <Button variant="ghost" className="flex gap-3 w-full">
              <span>Circle settings</span>
              <span>
                <GearIcon />
              </span>
            </Button>
          }
        />
      </div>
    </div>
  );
}
