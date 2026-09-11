import { updateUserStatus } from "@/actions/user-status";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

export function useUpdateUserStatus() {
  const updateUserStatusEmitter = useSocketEmit(SocketEvent.UserUpdatedStatus);
  const { getCircleIdsFromTopicMap } = useActiveCircleMembers();
  const circleIds = getCircleIdsFromTopicMap();

  const updateStatus = async (status: string | null) => {
    const resp = await updateUserStatus(status);

    if (resp && resp.data) {
      updateUserStatusEmitter.emit({
        user: resp.data,
        circleIds,
      });
    }
  };

  return { updateStatus };
}
