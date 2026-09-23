// Every surface that renders <Message> stamps a DOM id, and several can show
// the same message at once (main list + highlights tab, thread panel + list).
// Scoping by surface keeps ids unique so jump-to-message resolves the copy the
// user actually clicked from, not whichever one comes first in the document.
export type MessageSurface = "topic" | "sidebar" | "user-sheet" | "modal";

export function messageAnchorId(
  surface: MessageSurface | undefined,
  messageId: string,
) {
  return `message-${surface ?? "list"}-${messageId}`;
}
