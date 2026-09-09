import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";
import { TopicSidebarSkeleton } from "@/components/topics/topic-sidebar-skeleton";
import { TopicHeaderSkeleton } from "@/components/topics/topic-header-skeleton";
import { TopicMessageBarSkeleton } from "@/components/topics/topic-message-bar-skeleton";

export default function TopicLoading() {
  return (
    <div className="flex flex-col overflow-y-auto basis-full h-full">
      <TopicHeaderSkeleton />

      <div className="flex flex-1 flex-row overflow-y-hidden">
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="flex flex-col basis-full overflow-hidden">
            <MoreMessagesSkeleton count={20} />
          </div>

          <TopicMessageBarSkeleton />
        </div>

        <div className="flex overflow-y-hidden">
          <TopicSidebarSkeleton />
        </div>
      </div>
    </div>
  );
}
