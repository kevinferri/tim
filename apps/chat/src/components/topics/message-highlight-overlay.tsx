"use client";

import { tokenizeMessage } from "@/components/topics/message-utils";

type Props = {
  text: string;
  mentionNames: string[];
  topicNames: string[];
};

// Mirrors the composer's fully-transparent textarea content with colored
// spans for how @mention/#topic/command will render once sent -- font,
// padding, and wrapping must match the textarea exactly to stay
// character-aligned.
export function MessageHighlightOverlay({
  text,
  mentionNames,
  topicNames,
}: Props) {
  const tokens = tokenizeMessage(text, mentionNames, topicNames);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-base"
    >
      {tokens.map((token, index) => {
        switch (token.type) {
          case "command":
            return (
              <span key={index} className="font-pronounced">
                {token.value}
              </span>
            );

          case "mention":
          case "topicLink":
            return (
              <span key={index} className="text-mention">
                {token.value}
              </span>
            );

          default:
            return <span key={index}>{token.value}</span>;
        }
      })}
    </div>
  );
}
