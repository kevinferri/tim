"use client";

import { useMemo } from "react";

type Props = {
  sentAt: Date;
};

function format(date: Date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return date.toLocaleDateString("en-US", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
  });
}

export function MessageSentAt(props: Props) {
  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-slate-300 text-xs">
        {format(props.sentAt)}
      </time>
    </>
  );
}
