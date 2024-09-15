import { cn, isEmojiOnly } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import Linkify from "react-linkify";
import { SocketEvent, useSocketEmit } from "../socket/use-socket";

type Props = {
  id: string;
  topicId: string;
  text?: string | null;
  isNewestMessage?: boolean;
};

export function MessageText(props: Props) {
  const isOnlyEmoji = useMemo(
    () => (props.text ? isEmojiOnly(props.text) : false),
    [props.text]
  );

  const clickedLink = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserClickedLink
  );

  return (
    <Linkify
      componentDecorator={(decoratedHref, decoratedText, key) => (
        <Link
          key={key}
          target="_blank"
          href={decoratedHref}
          className="underline text-purple-700 dark:text-purple-500 underline-offset-4 hover:opacity-80"
          onClick={() => {
            clickedLink.emit({ topicId: props.topicId, messageId: props.id });
          }}
        >
          {decoratedText}
        </Link>
      )}
    >
      <div
        className={cn(
          "whitespace-pre-line break-word leading-normal",
          isOnlyEmoji ? "text-4xl" : ""
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {props.text}
      </div>
    </Linkify>
  );
}
