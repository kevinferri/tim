import { Skeleton } from "@/components/ui/skeleton";

// Stand-in for TopicMessageBar (the composer) while the topic is still
// loading -- see topic-message-bar.tsx for the real thing.
export function TopicMessageBarSkeleton() {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between rounded-md border border-input p-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>
    </div>
  );
}
