import { Suspense } from "react";
import { TopicsNav } from "@/components/topics/topics-nav";
import { TopicsNavSkeleton } from "@/components/topics/topics-nav-skeleton";

type Props = {
  children: React.ReactNode;
  params: Promise<{
    circleId: string;
  }>;
};

export default async function CircleLayout(props: Props) {
  const params = await props.params;

  return (
    <>
      {/* Without this boundary, TopicsNav's own suspension (it has no loading state) would bubble up and block the topic page's own loading.tsx instead of letting it show on its own. */}
      <Suspense fallback={<TopicsNavSkeleton />}>
        <TopicsNav circleId={params.circleId} />
      </Suspense>
      {props.children}
    </>
  );
}
