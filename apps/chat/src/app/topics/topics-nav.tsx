import { prismaClient } from "@/lib/prisma/client";
import { CreateTopicForm } from "./create-topic-form";
import Link from "next/link";
import { getLinkForTopic } from "@/routes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GearIcon } from "@radix-ui/react-icons";

export async function TopicsNav({
  circleId,
  topicId,
}: {
  circleId: string;
  topicId?: string;
}) {
  const parentCircle = await prismaClient.circle.getMeCircleById({
    circleId,
    select: {
      id: true,
      name: true,
    },
  });

  const topics = await prismaClient.topic.getMeAllTopicsForCircle({
    circleId,
    select: {
      name: true,
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="flex flex-col shadow-md border-r max-w-[270px] min-w-[270px]">
      <div className="block p-3 border-b overflow-hidden whitespace-nowrap text-ellipsis">
        {parentCircle?.name}
      </div>

      {topics ? (
        <ScrollArea>
          <div className="flex flex-col gap-2 p-3">
            {topics.map((topic) => {
              return (
                <Link href={getLinkForTopic(topic.id)} key={topic.id}>
                  <Button
                    variant={topic.id === topicId ? "secondary" : "ghost"}
                    className="w-full flex justify-start"
                  >
                    {topic.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        "No topics yet..."
      )}

      <div className="flex flex-col items-center mt-auto gap-3 p-3">
        <CreateTopicForm circleId={circleId} circleName={parentCircle?.name} />
        <Button variant="ghost" className="flex gap-2 w-full">
          <span>Circle settings</span>
          <span>
            <GearIcon />
          </span>
        </Button>
      </div>
    </div>
  );
}
