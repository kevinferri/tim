"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ReplyThreadPanel } from "@/components/topics/reply-thread-panel";
import { useTopicUiContext } from "@/components/topics/current-topic-provider";

type Props = {
  topicId: string;
};

// A thread is a secondary, follow-the-breadcrumbs view of messages that already
// live in the transcript -- so a modal sheet fits: dip in, read, dismiss. Radix
// handles presence (so the slide always replays), escape/outside-click to close,
// and focus. Rendered outside the sidebar so it works below `md` too.
export function ReplyThreadSheet({ topicId }: Props) {
  const { openThreadRootId, setOpenThreadRootId } = useTopicUiContext();

  return (
    <Sheet
      open={!!openThreadRootId}
      onOpenChange={(open) => {
        if (!open) setOpenThreadRootId(undefined);
      }}
    >
      <SheetContent
        side="right"
        // [&>button]:hidden drops SheetContent's built-in close -- the panel
        // has its own in its header, and two would sit on top of each other.
        className="flex w-3/4 flex-col gap-0 p-0 sm:max-w-sm [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Thread</SheetTitle>
        {openThreadRootId && (
          <ReplyThreadPanel topicId={topicId} threadRootId={openThreadRootId} />
        )}
      </SheetContent>
    </Sheet>
  );
}
