import { cn, isEmojiOnly } from "@/lib/utils";
import { isValidCommand } from "@/components/topics/message-utils";
import Link from "next/link";
import { useMemo } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import Linkify from "linkify-react";

type Props = {
  id: string;
  topicId: string;
  text?: string | null;
  isNewestMessage?: boolean;
};

function parseMessage(text: string) {
  if (!text) return text;

  const parts = text.split(" ");
  const firstPart = parts[0];

  if (isValidCommand(text)) {
    const command = firstPart;
    const rest = parts.slice(1).join(" ");

    return (
      <>
        <span className="font-pronounced">{command}</span>
        {rest && ` ${rest}`}
      </>
    );
  }

  return text;
}

export function MessageText(props: Props) {
  const isOnlyEmoji = useMemo(
    () => (props.text ? isEmojiOnly(props.text) : false),
    [props.text],
  );

  const clickedLink = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserClickedLink,
  );

  return (
    <Linkify
      options={{
        render: {
          url: ({ attributes, content }) => (
            <Link
              href={attributes.href}
              target="_blank"
              className="underline text-purple-700 dark:text-purple-500 underline-offset-4 hover:opacity-80"
              onClick={() => {
                clickedLink.emit({
                  topicId: props.topicId,
                  messageId: props.id,
                });
              }}
            >
              {content}
            </Link>
          ),
        },
      }}
    >
      <div
        className={cn(
          "whitespace-pre-line break-word leading-normal",
          isOnlyEmoji ? "text-4xl" : "",
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {props.text ? parseMessage(props.text) : null}
      </div>
    </Linkify>
  );
}
