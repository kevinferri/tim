import { Button } from "@/components/ui/button";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { UpsertTopicForm } from "./upsert-topic-form";
import { Topic } from "@prisma/client";

type Props = {
  topic: Pick<Topic, "id" | "name" | "userId" | "description"> & {
    parentCircle: {
      id: string;
      name: string;
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
          trigger={
            <Button
              variant="ghost"
              size="iconSm"
              className="absolute top-[9px]"
            >
              <InfoCircledIcon className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
