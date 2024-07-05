import { CirclesNav } from "@/circles/circles-nav";
import { Content } from "@/components/layouts/dashboard/content";
import { TopicsNav } from "@/topics/topics-nav";
import { UserRoomConnect } from "@/components/layouts/dashboard/user-room-connect";
import { ActiveCircleMembersProvider } from "@/components/layouts/dashboard/active-circle-members-provider";
import { CircleRoomConnect } from "./circle-room-connect";

type Props = {
  circleId?: string;
  topicId?: string;
  children: React.ReactNode;
};

export const DashboardLayout = ({ circleId, topicId, children }: Props) => {
  return (
    <UserRoomConnect>
      <div className="flex flex-col h-screen">
        <div className="flex overflow-hidden basis-full">
          <ActiveCircleMembersProvider>
            <CirclesNav circleId={circleId} />
            {circleId ? (
              <CircleRoomConnect circleId={circleId}>
                <TopicsNav topicId={topicId} circleId={circleId} />
                <Content>{children}</Content>
              </CircleRoomConnect>
            ) : (
              <div className="flex basis-full justify-center items-center">
                {children}
              </div>
            )}
          </ActiveCircleMembersProvider>
        </div>
      </div>
    </UserRoomConnect>
  );
};
