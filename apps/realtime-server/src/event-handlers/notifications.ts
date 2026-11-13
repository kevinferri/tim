import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, toRoomKey } from "./rooms";
import { getCircleMembers, isUserInCircle } from "../db/circles";

// Relays a refetch ping to the sender's circle-mates. Carries no data, so the
// only trust needed is that the sender is a member.
export function handleCircleNotificationsChanged({
  socket,
  server,
}: HandlerArgs) {
  socket.on(
    SocketEvent.CircleNotificationsChanged,
    async (payload: { circleId?: unknown } | undefined) => {
      const circleId = payload?.circleId;
      const userId = socket.data.user.id;
      if (typeof circleId !== "string") return;
      if (!(await isUserInCircle({ userId, circleId }))) return;

      const members = await getCircleMembers({ circleId });
      for (const { id } of members) {
        if (id === userId) continue;
        server
          .to(toRoomKey({ id, roomType: RoomType.User }))
          .emit(SocketEvent.CircleNotificationsChanged, { circleId });
      }
    },
  );
}
