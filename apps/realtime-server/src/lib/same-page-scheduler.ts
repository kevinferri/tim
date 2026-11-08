import { RoomType, SocketEvent, SamePageAlertPayload } from "@tim/socket-types";
import { toRoomKey } from "../event-handlers/rooms";
import { AppServer } from "./socket";

type TickAlert = SamePageAlertPayload & { userIds: string[] };

/**
 * Polls the chat app's Same Page tick endpoint once a minute and fans out
 * socket alerts to each target user's room.
 */
export function startSamePageScheduler(server: AppServer) {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.JWT_SECRET;
  if (!frontendUrl || !secret) {
    console.warn(
      "[same-page] FRONTEND_URL or JWT_SECRET missing; scheduler disabled",
    );
    return;
  }

  const tick = async () => {
    try {
      const res = await fetch(`${frontendUrl}/api/internal/same-page/tick`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        console.error("[same-page] tick failed", res.status);
        return;
      }
      const body = (await res.json()) as { alerts?: TickAlert[] };
      for (const alert of body.alerts ?? []) {
        const payload: SamePageAlertPayload = {
          circleId: alert.circleId,
          kind: alert.kind,
          gameDate: alert.gameDate,
          prompt: alert.prompt,
        };
        for (const userId of alert.userIds) {
          server
            .to(toRoomKey({ id: userId, roomType: RoomType.User }))
            .emit(SocketEvent.SamePageAlert, payload);
        }
      }
    } catch (err) {
      console.error("[same-page] tick error", err);
    }
  };

  // Stagger first tick slightly so the chat app is up after a joint restart.
  setTimeout(tick, 15_000);
  setInterval(tick, 60_000);
}
