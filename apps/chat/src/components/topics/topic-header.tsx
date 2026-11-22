import { Button } from "@/components/ui/button";
import { UpsertTopicForm } from "@/components/topics/upsert-topic-form";
import { Topic } from "@prisma/client";
import { TopicActiveUsers } from "@/components/topics/topic-active-users";
import { HEADER_ROW_HEIGHT } from "@/components/topics/header-row";
import { cn } from "@/lib/utils";

type Props = {
  topic: Pick<Topic, "id" | "name" | "userId" | "description"> & {
    parentCircle: {
      id: string;
      name: string;
      defaultTopicId?: string | null;
    };
  };
};

export function TopicHeader(props: Props) {
  return (
    <div
      className={cn(
        "flex flex-row shrink-0 px-3 border-b items-center gap-3",
        HEADER_ROW_HEIGHT,
      )}
    >
      <div className="flex min-w-0 flex-1 [&>div]:flex [&>div]:w-auto [&>div]:min-w-0">
        <UpsertTopicForm
          existingTopic={props.topic}
          circleId={props.topic.parentCircle.id}
          circleName={props.topic.parentCircle.name}
          isDefaultTopic={
            props.topic.id === props.topic.parentCircle.defaultTopicId
          }
          trigger={
            <Button
              variant="ghost"
              className="-ml-2 h-8 min-w-0 justify-start px-2 text-base font-medium"
              title="Topic settings"
            >
              <span className="min-w-0 truncate">{props.topic.name}</span>
            </Button>
          }
        />
      </div>
      <div className="flex shrink-0 items-center">
        <TopicActiveUsers topicId={props.topic.id} />
      </div>
    </div>
  );
}
