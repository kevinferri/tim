"use client";

import { useDateFormatter } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  const sentAt = useDateFormatter(props.sentAt);

  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-slate-300 text-xs">
        {sentAt}
      </time>
    </>
  );
}
