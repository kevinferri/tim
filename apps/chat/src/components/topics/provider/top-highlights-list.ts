import { MessageProps } from "@/components/topics/message";

const count = (m: MessageProps) => m.highlights?.length ?? 0;
const time = (m: MessageProps) => new Date(m.createdAt ?? Date.now()).getTime();

// Mirrors the server's orderBy: highlight count desc, then createdAt desc.
export function rankTopHighlights(messages: MessageProps[], limit: number) {
  return messages
    .filter((m) => count(m) > 0)
    .sort((a, b) => count(b) - count(a) || time(b) - time(a))
    .slice(0, limit);
}

type Patch = (m: MessageProps) => MessageProps;

// `refetch` means the right answer depends on messages we don't have locally.
export type TopListUpdate = { list: MessageProps[]; refetch: boolean };

export function applyHighlightAdded(
  list: MessageProps[],
  {
    messageId,
    patch,
    knownMessage,
    periodStart,
    limit,
  }: {
    messageId: string;
    patch: Patch;
    knownMessage?: MessageProps;
    periodStart?: Date;
    limit: number;
  },
): TopListUpdate {
  if (list.some((m) => m.id === messageId)) {
    return { list: rankTopHighlights(list.map(patch), limit), refetch: false };
  }

  // No local copy means no count or createdAt to rank it by.
  if (!knownMessage) return { list, refetch: true };

  const candidate = patch(knownMessage);
  if (periodStart && time(candidate) < periodStart.getTime()) {
    return { list, refetch: false };
  }

  return {
    list: rankTopHighlights([...list, candidate], limit),
    refetch: false,
  };
}

export function applyHighlightRemoved(
  list: MessageProps[],
  {
    messageId,
    patch,
    limit,
  }: { messageId: string; patch: Patch; limit: number },
): TopListUpdate {
  // An outsider losing a highlight can't move into the list.
  if (!list.some((m) => m.id === messageId)) return { list, refetch: false };

  const next = rankTopHighlights(list.map(patch), limit);

  // A short list already holds every highlighted message in the period, so
  // nothing outside it can take the freed slot.
  if (list.length < limit) return { list: next, refetch: false };

  // A full list may have outsiders tied with or just below its last entry; if
  // this message dropped out or to the bottom, one of them may outrank it.
  const droppedToBottom =
    next.length < list.length || next[next.length - 1]?.id === messageId;

  return { list: next, refetch: droppedToBottom };
}
