import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EmitEvent, useSocketEmit } from "@/components/socket/use-socket";
import { HighlightTooltip } from "./highlight-tooltip";

export type Highlights = {
  id: Highlight["id"];
  userId: Highlight["userId"];
  createdBy: {
    imageUrl: User["imageUrl"];
  };
}[];

export type MessageProps = {
  id: DbMessage["id"];
  text?: DbMessage["text"];
  createdAt: DbMessage["createdAt"];
  sentBy: Pick<User, "id" | "name" | "imageUrl">;
  highlights: Highlights;
  topicId: string;
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

const baseStyles = [
  "z-0",
  "p-3",
  "relative",
  "leading-snug",
  "hover:bg-slate-50",
  "dark:hover:bg-slate-900",
  "after:content-['']",
  "after:h-full",
  "after:absolute",
  "after:left-[0]",
  "after:top-[0]",
  "after:w-[0]",
  "after:-z-10",
];

const highlightStyles = [
  "after:-z-10",
  "after:w-full",
  "after:bg-highlight",
  "dark:after:bg-yellow-600",
  "after:[transition:500ms]",
  "dark:text-secondary",
];

export const Message = (props: MessageProps) => {
  const self = useSelf();
  const highlightedBySelf = !!props.highlights.find(
    (highlight) => self.id === highlight.userId
  );

  const toggleHighlight = useSocketEmit<{ messageId: string; topicId: string }>(
    EmitEvent.ToggleHighlight
  );

  const handleToggleHighlight = () => {
    toggleHighlight.emit({
      messageId: props.id,
      topicId: props.topicId,
    });
  };

  return (
    <div
      className={cn(baseStyles, highlightedBySelf ? highlightStyles : "")}
      onDoubleClick={handleToggleHighlight}
    >
      <div className="flex gap-2">
        <Avatar className="shadow-md">
          <AvatarImage
            className="rounded-full"
            src={props.sentBy.imageUrl ?? undefined}
          />
          <AvatarFallback>
            {getInitials(props.sentBy.name ?? undefined)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col w-full">
          <div>
            <div className="flex">
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
              <time className="text-slate-300 text-xs mt-auto">
                {props.createdAt.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })}
                {", "}
                {props.createdAt.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                })}
              </time>
              <div className="h-0 ml-auto">
                <HighlightTooltip
                  highlightedBySelf={highlightedBySelf}
                  highlights={props.highlights}
                  messageId={props.id}
                  onHighlight={handleToggleHighlight}
                />
              </div>
            </div>
          </div>
          <div className="whitespace-pre-line break-all">{props.text}</div>
        </div>
      </div>
    </div>
  );
};
