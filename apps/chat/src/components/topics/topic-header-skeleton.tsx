import { Skeleton } from "@/components/ui/skeleton";

// h-6 matches the real header's 24px line-height, so this comes out to the
// same 48px row height (with p-3) -- keeps the border-b aligned across the
// page while things load.
export function TopicHeaderSkeleton() {
  return (
    <div className="flex flex-row justify-left p-3 border-b items-center gap-1">
      <Skeleton className="h-6 w-32" />
    </div>
  );
}
