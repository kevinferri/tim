"use client";

import { useState } from "react";
import { useEffectOnce } from "./use-effect-once";

function format(date: Date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(date).toLocaleDateString("en-US", {
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
  useEffectOnce(() => setD(date ? format(date) : undefined));
  return d;
}
