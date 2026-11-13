import { cn } from "@/lib/utils";

/** Same Page mark — open book with matching lines on both pages. */
export function SamePageIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M12 6.5c-2.2-1.4-5.2-1.6-7.5-.6v12c2.3-1 5.3-.8 7.5.6 2.2-1.4 5.2-1.6 7.5-.6v-12c-2.3-1-5.3-.8-7.5.6Z" />
      <path d="M12 7v11.5" />
      <path d="M6.5 10.2h3.2M6.5 12.6h3.2" opacity="0.55" />
      <path d="M14.3 10.2h3.2M14.3 12.6h3.2" opacity="0.55" />
    </svg>
  );
}
