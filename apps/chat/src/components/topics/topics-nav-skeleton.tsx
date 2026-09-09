import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";
import { TopicsNavHeaderSkeleton } from "@/components/topics/topics-nav-header-skeleton";

// Stand-in for TopicsNav's TopicsList while its own data (topics, circle
// info, unread history) is still loading.
export function TopicsNavSkeleton() {
  return (
    <div className="flex flex-col shadow-md border-r shrink-0 max-w-sidebar-nav min-w-sidebar-nav lg:max-w-sidebar-nav-lg lg:min-w-sidebar-nav-lg">
      <TopicsNavHeaderSkeleton />
      <MoreMessagesSkeleton count={8} />
    </div>
  );
}
