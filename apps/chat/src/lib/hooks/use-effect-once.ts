"use client";

import { useState, useEffect, useRef } from "react";

export function useEffectOnce(effect: () => void | (() => void)) {
  const destroyFunc = useRef<void | (() => void)>(undefined);
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [_, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    setVal((val) => val + 1);

    return () => {
      // No render happened since the effect ran -- this is StrictMode's phantom mount/unmount cycle, not a real unmount, so skip cleanup.
      if (!renderAfterCalled.current) {
        return;
      }

      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
