import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pick 'em mark -- a target, at the Game room's shared stroke weight. */
export function NflAtsIcon({ className }: { className?: string }) {
  return (
    <Target
      strokeWidth={1.75}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
