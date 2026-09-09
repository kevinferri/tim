import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";

export function TopicSidebarSkeleton() {
  return (
    <div className="hidden w-sidebar-detail lg:w-sidebar-detail-lg md:flex flex-col shadow-md border-l shrink-0 overflow-hidden">
      <MoreMessagesSkeleton count={10} />
    </div>
  );
}
