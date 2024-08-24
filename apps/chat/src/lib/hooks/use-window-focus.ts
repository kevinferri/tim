"use client";

import { useEffect, useState } from "react";

const hasFocus = () => typeof document !== "undefined" && document.hasFocus();

type Args = {
  onFocus?: () => void;
  onBlur?: () => void;
};

export function useWindowFocus(args: Args = {}) {
  const [focused, setFocused] = useState(hasFocus);

  useEffect(() => {
    setFocused(hasFocus());

    const onFocus = () => {
      setFocused(true);
      args?.onFocus?.();
    };

    const onBlur = () => {
      setFocused(false);
      args?.onBlur?.();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [args]);

  return focused;
}
