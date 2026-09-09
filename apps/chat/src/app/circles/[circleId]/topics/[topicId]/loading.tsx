import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";
import { TopicSidebarSkeleton } from "@/components/topics/topic-sidebar-skeleton";

export default function TopicLoading() {
  return (
    <div className="flex flex-row basis-full h-full overflow-hidden">
      <div className="flex flex-col basis-full overflow-hidden">
        <MoreMessagesSkeleton count={20} />
      </div>

      <TopicSidebarSkeleton />
    </div>
  );
}
