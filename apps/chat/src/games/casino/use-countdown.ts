"use client";

import { useEffect, useState } from "react";

/** Ms left until a performance.now() deadline, ticking a few times a second. */
export function useCountdown(deadline: number | null) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
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
