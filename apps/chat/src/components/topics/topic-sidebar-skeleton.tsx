import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";

export function TopicSidebarSkeleton() {
  return (
    <div className="hidden w-[280px] lg:w-[320px] md:flex flex-col shadow-md border-l shrink-0 overflow-hidden">
      <MoreMessagesSkeleton count={10} />
    </div>
  );
}
