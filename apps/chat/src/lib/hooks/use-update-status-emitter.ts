import { updateUserStatus } from "@/actions/user-status";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

export function useUpdateStatusEmitter() {
  const updateUserStatusEmitter = useSocketEmit(SocketEvent.UpdateUserStatus);
  const { getCircleIdsFromTopicMap } = useActiveCircleMembers();
  const circleIds = getCircleIdsFromTopicMap();

  const emit = (payload: Awaited<ReturnType<typeof updateUserStatus>>) => {
    if (payload && payload.data) {
      circleIds.forEach((circleId) => {
        updateUserStatusEmitter.emit({
          user: payload.data,
          circleId,
        });
      });
    }
  };

  return { emit };
}
