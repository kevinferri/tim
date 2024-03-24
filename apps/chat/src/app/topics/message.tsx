import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EmitEvent, useSocketEmit } from "@/components/socket/use-socket";

export type MessageProps = {
  id: DbMessage["id"];
  text?: DbMessage["text"];
  createdAt: DbMessage["createdAt"];
  sentBy: Pick<User, "id" | "name" | "imageUrl">;
  highlights: Pick<Highlight, "id" | "userId">[];
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((x) => x.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export const Message = (props: MessageProps) => {
  const self = useSelf();
  const highlightedBySelf = !!props.highlights.find(
    (highlight) => self.id === highlight.userId
  );

  const toggleHighlight = useSocketEmit<{ messageId: string }>(
    EmitEvent.ToggleHighlight
  );

  const handleToggleHighlight = () => {
    toggleHighlight.emit({
      messageId: props.id,
    });
  };

  return (
    <div
      className={cn(
        `hover:bg-slate-50 dark:hover:bg-slate-900 p-3 leading-snug ${
          highlightedBySelf &&
          "bg-highlight dark:text-secondary hover:bg-highlight"
        }`
      )}
      onDoubleClick={() => handleToggleHighlight()}
    >
      <code>{props.highlights.length}</code>
      <div className="flex gap-2">
        <Avatar className="shadow-md h-10 w-10">
          <AvatarImage
            className="rounded-full"
            src={props.sentBy.imageUrl ?? undefined}
          />
          <AvatarFallback>
            {getInitials(props.sentBy.name ?? undefined)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div>
            <span
              className={cn(
                `mr-2 font-semibold ${
                  props.sentBy.id === self.id &&
                  "text-purple-700 dark:text-purple-500"
                }`
              )}
            >
              {props.sentBy.name}
            </span>
            <span className="text-slate-300 text-xs">
              {props.createdAt.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
              {", "}
              {props.createdAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
              })}
            </span>
          </div>
          <span className="whitespace-pre-line">{props.text}</span>
        </div>
      </div>
    </div>
  );
};
