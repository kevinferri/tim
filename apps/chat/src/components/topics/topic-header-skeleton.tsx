import { Skeleton } from "@/components/ui/skeleton";

// Stand-in for TopicHeader while the topic itself is still loading -- see
// topic-header.tsx for the real thing. h-6 matches the 24px line-height of
// the real header's title text/iconSm button, so this row comes out to the
// same 48px height (with p-3) as the real header and as
// topics-nav-header-skeleton.tsx's row in the left sidebar -- keeping the
// border-b under each aligned across the page while both are loading.
export function TopicHeaderSkeleton() {
  return (
    <div className="flex flex-row justify-left p-3 border-b items-center gap-1">
      <Skeleton className="h-6 w-32" />
    </div>
  );
}
