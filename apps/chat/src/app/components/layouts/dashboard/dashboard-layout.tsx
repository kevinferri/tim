import { CirclesNav } from "@/circles/circles-nav";
import { Content } from "@/components/layouts/dashboard/content";
import { TopicsNav } from "@/topics/topics-nav";

export const DashboardLayout = ({
  circleId,
  topicId,
  children,
}: {
  circleId?: string;
  topicId?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex overflow-hidden h-100 basis-full">
        <CirclesNav circleId={circleId} />
        {circleId ? (
          <>
            <TopicsNav topicId={topicId} circleId={circleId} />
            <Content>{children}</Content>
          </>
        ) : (
          <div className="flex basis-full justify-center items-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
