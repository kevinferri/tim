"use client";

import { useSelf } from "../auth/self-provider";

export function TimeGreeting() {
  const self = useSelf();
  const date = new Date();
  const hours = date.getHours();
  const status =
    hours < 12
      ? "morning"
      : hours <= 18 && hours >= 12
      ? "afternoon"
      : "evening";

  return (
    <span>
      Good {status}, {self.name}
    </span>
  );
}
