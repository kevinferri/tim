import { Skeleton } from "@/components/ui/skeleton";

// Stand-in for TopicsList's own header row (circle name + collapse button)
// -- see topics-list.tsx. h-6 matches its real title text/iconSm button
// height so this row comes out to the same 48px height (with p-3) as
// topic-header-skeleton.tsx's row on the other side of the page, keeping
// the two border-b lines aligned while both are loading.
export function TopicsNavHeaderSkeleton() {
  return (
    <div className="flex p-3 border-b items-center">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-6 w-6 rounded-md ml-auto" />
    </div>
  );
}
