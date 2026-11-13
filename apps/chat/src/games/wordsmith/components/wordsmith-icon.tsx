import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordsmith mark — a quill feather, at Same Page's stroke weight. */
export function WordsmithIcon({ className }: { className?: string }) {
  return (
    <Feather
      strokeWidth={1.75}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
