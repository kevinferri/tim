"use client";

import { formatDate } from "@/lib/utils";
import { useMemo } from "react";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  const sentAt = useMemo(() => formatDate(props.sentAt), [props.sentAt]);

  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-slate-300 text-xs">
        {sentAt}
      </time>
    </>
  );
}
