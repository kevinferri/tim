"use client";

import { useNow } from "@/lib/hooks/use-now";
import { formatFullDateTime, formatTranscriptTime } from "@/lib/relative-time";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  const now = useNow();
  const sentAt = new Date(props.sentAt);

  return (
    <>
      {" "}
      <time
        suppressHydrationWarning
        dateTime={sentAt.toISOString()}
        title={now === null ? undefined : formatFullDateTime(sentAt)}
        className="text-[11px] text-muted-foreground/80"
      >
        {now === null ? undefined : formatTranscriptTime(sentAt, new Date(now))}
      </time>
    </>
  );
}
