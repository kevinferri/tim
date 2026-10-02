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
        className="text-muted-foreground text-xs"
      >
        {now === null ? undefined : formatTranscriptTime(sentAt, new Date(now))}
      </time>
    </>
  );
}
