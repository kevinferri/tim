"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TABLE_CHAT_KEPT,
  type TableChatLine,
  type TableChatPayload,
  type TableChatSay,
  type TableChatSendPayload,
  type TableRef,
} from "@tim/casino";
import { useSocketContext } from "@/components/socket/socket-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useSelf } from "@/components/auth/self-provider";

export type TableChat = {
  lines: TableChatLine[];
  /** The newest thing a player said live (not with the recent lines on watch, and not a table event). */
  latest: TableChatSay | null;
  send: (text: string) => void;
};

/** One table's chat. Watching is useTable's job; the server sends the recent lines with each watch. */
export function useTableChat({ circleId, game }: TableRef): TableChat {
  const { socket } = useSocketContext();
  const self = useSelf();
  const [lines, setLines] = useState<TableChatLine[]>([]);
  const [latest, setLatest] = useState<TableChatSay | null>(null);

  useSocketHandler<TableChatPayload>(SocketEvent.TableChat, (payload) => {
    if (payload.circleId !== circleId || payload.game !== game) return;
    if ("recent" in payload) return setLines(payload.recent);
    const { line } = payload;
    // You know you just sat down or got up.
    if (line.kind !== "say" && line.userId === self.id) return;
    // Room for the joins and leaves seen this visit, on top of what was said.
    setLines((l) => [...l, line].slice(-2 * TABLE_CHAT_KEPT));
    if (line.kind === "say") setLatest(line);
  });

  const send = useCallback(
    (text: string) =>
      socket.emit(SocketEvent.TableChatSend, {
        circleId,
        game,
        text,
      } as TableChatSendPayload),
    [socket, circleId, game],
  );

  return { lines, latest, send };
}

type ChatBubble = { line: TableChatSay; ms: number };

/** Longer lines stay up longer, to be read. */
const bubbleMs = (text: string) =>
  Math.min(5_000, Math.max(2_500, 1_500 + text.length * 40));

/** Each player's latest line as a brief bubble over their avatar, by user id. */
export function useChatBubbles(latest: TableChatSay | null) {
  const [bubbles, setBubbles] = useState<Map<string, ChatBubble>>(new Map());
  // Outside the effect's cleanup, which the next line would run, cancelling the removal.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!latest) return;
    const bubble = { line: latest, ms: bubbleMs(latest.text) };
    setBubbles((b) => new Map(b).set(latest.userId, bubble));
    timers.current.push(
      setTimeout(
        () =>
          setBubbles((b) => {
            if (b.get(latest.userId)?.line.id !== latest.id) return b;
            const rest = new Map(b);
            rest.delete(latest.userId);
            return rest;
          }),
        bubble.ms,
      ),
    );
  }, [latest]);

  return bubbles;
}
