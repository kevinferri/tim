import { Button } from "@/components/ui/button";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { UpsertTopicForm } from "@/topics/upsert-topic-form";
import { Topic } from "@prisma/client";
import { TopicActiveUsers } from "@/topics/topic-active-users";

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
    <div className="flex flex-row justify-left p-3 border-b p-3 items-center gap-1">
      <div className="font-medium">{props.topic.name}</div>
      <div>
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
              size="iconSm"
              className="absolute top-[12px]"
            >
              <InfoCircledIcon className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      <div className="absolute right-3">
        <TopicActiveUsers topicId={props.topic.id} />
      </div>
    </div>
  );
}
