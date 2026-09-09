import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";

// Stand-in for TopicsNav's TopicsList while its own data (topics, circle
// info, unread history) is still loading.
export function TopicsNavSkeleton() {
  return (
    <div className="flex flex-col shadow-md border-r shrink-0 max-w-[220px] min-w-[220px] lg:max-w-[280px] lg:min-w-[280px]">
      <MoreMessagesSkeleton count={8} />
    </div>
  );
}
