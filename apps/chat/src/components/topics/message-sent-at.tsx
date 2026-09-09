"use client";

import { useDateFormatter } from "@/lib/hooks/use-date-formatter";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  const sentAt = useDateFormatter(props.sentAt);

  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-muted-foreground text-xs">
        {sentAt}
      </time>
    </>
  );
}
