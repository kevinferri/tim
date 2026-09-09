"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThinkingDotsProps = {
  className?: string;
};

export function ThinkingDots({ className }: ThinkingDotsProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === ".") return "..";
        if (prev === "..") return "...";
        return ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={cn("text-muted-foreground font-mono text-xs", className)}>
      {dots}
    </span>
  );
}
