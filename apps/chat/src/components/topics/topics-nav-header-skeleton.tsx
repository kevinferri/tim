import { Skeleton } from "@/components/ui/skeleton";

// h-6 matches the real header's title/button height, so this row comes out
// to the same 48px height (with p-3) -- keeps border-b lines aligned across
// the page while loading.
export function TopicsNavHeaderSkeleton() {
  return (
    <div className="flex p-3 border-b items-center">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-6 w-6 rounded-md ml-auto" />
    </div>
  );
}
