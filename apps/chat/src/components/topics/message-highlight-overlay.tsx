"use client";

import { tokenizeMessage } from "@/components/topics/message-utils";

type Props = {
  text: string;
  mentionNames: string[];
  topicNames: string[];
};

// Sits behind the composer's textarea (see topic-message-bar.tsx), which
// renders its own text fully transparent -- a native textarea can't color
// individual substrings, so this mirrors the same content with @mention/
// #topic/command spans colored the way they'll actually render once sent
// (same tokenizeMessage used by message-text.tsx). Font size, padding, and
// wrapping must match the textarea's exactly (see the className there) or
// the two won't line up character-for-character.
export function MessageHighlightOverlay({ text, mentionNames, topicNames }: Props) {
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
