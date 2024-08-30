"use client";

import { useState } from "react";
import { useEffectOnce } from "./use-effect-once";

function format(date?: Date) {
  if (!date) return undefined;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return date.toLocaleDateString("en-US", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
  });
}

/**
 * Forces the date to be formatted client side
 */
export function useDateFormatter(date?: Date) {
  const [d, setD] = useState<string>();
  useEffectOnce(() => setD(format(date)));
  return d;
}
