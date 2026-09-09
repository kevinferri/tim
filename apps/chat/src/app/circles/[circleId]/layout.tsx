import { Suspense } from "react";
import { TopicsNav } from "@/components/topics/topics-nav";
import { TopicsNavSkeleton } from "@/components/topics/topics-nav-skeleton";

type Props = {
  children: React.ReactNode;
  params: {
    circleId: string;
  };
};

export default async function CircleLayout(props: Props) {
  const params = await props.params;

  return (
    <>
      {/* TopicsNav has its own data fetch and no loading state of its
          own -- without this Suspense boundary, its suspension bubbles
          up past this layout (which has none either) and gets caught by
          whatever boundary is above it, blocking/overriding the topic
          page's own [topicId]/loading.tsx instead of letting it show on
          its own. */}
      <Suspense fallback={<TopicsNavSkeleton />}>
        <TopicsNav circleId={params.circleId} />
      </Suspense>
      {props.children}
    </>
  );
}
