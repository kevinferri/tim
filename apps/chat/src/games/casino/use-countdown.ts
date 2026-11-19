"use client";

import { useLayoutEffect, useState } from "react";

/** Ms left until a performance.now() deadline, ticking a few times a second. */
export function useCountdown(deadline: number | null) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  // Before paint, so a new deadline never renders against the old timer's msLeft.
  useLayoutEffect(() => {
    if (deadline === null) {
      setMsLeft(null);
      return;
    }
    const tick = () => setMsLeft(Math.max(0, deadline - performance.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);

  return msLeft;
}
