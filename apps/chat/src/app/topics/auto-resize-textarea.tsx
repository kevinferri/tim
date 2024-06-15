"use client";

import { Textarea } from "@/components/ui/textarea";
import { useEffectOnce } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { ChangeEvent, KeyboardEvent, useRef } from "react";

type Props = {
  disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  value: string;
  className?: string;
  onPaste?: (e: ClipboardEvent) => void;
};

function adjustHeight(target: ChangeEvent<HTMLTextAreaElement>["target"]) {
  target.style.height = "";
  target.style.height = `${target.scrollHeight + 0.5}px`;
}

export function AutoResizeTextarea(props: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  ref.current && props.onPaste
    ? (ref.current.onpaste = props.onPaste)
    : undefined;

  useEffectOnce(() => {
    if (!ref.current) return;
    adjustHeight(ref.current);

    ref.current.selectionStart = ref.current.value.length;
  });

  return (
    <Textarea
      onDoubleClick={(e) => {
        e.stopPropagation();
      }}
      ref={ref}
      disabled={props.disabled}
      rows={1}
      autoFocus
      className={cn(
        "bg-background focus-visible:ring-transparent focus-visible:transparent resize-none text-base shadow-none overflow-hidden",
        props.className
      )}
      onChange={(e) => {
        props.onChange(e);
        adjustHeight(e.target);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.style.height = "";
        }

        props.onKeyDown(e);
      }}
      value={props.value ?? ""}
    />
  );
}
