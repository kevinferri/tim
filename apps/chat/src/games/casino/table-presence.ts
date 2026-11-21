// What a player should be told about their seat across a disconnect, decided from socket events alone.

/** restarting: the server announced it's closing. restarted: the server came back as a new process without your seat. disconnected: our own drop stood us up. */
export type PresenceNotice = "restarting" | "restarted" | "disconnected" | null;

export type PresenceState = {
  /** The server process last seen (it changes only when the server restarts). */
  serverId: string | null;
  seated: boolean;
  /** Set on disconnect while seated: the server we were seated on. */
  droppedFrom: string | null;
  /** We asked to leave, so losing the seat is expected. */
  stood: boolean;
  /** The notice on the table now. */
  shown: PresenceNotice;
};

export type PresenceEvent =
  | { type: "disconnect" }
  | { type: "closing" }
  | { type: "stand" }
  /** A seat-lost notice has been up long enough. */
  | { type: "expire" }
  | {
      type: "state";
      serverId: string;
      seated: boolean;
      /** Your seat is being given up (the server stood you up mid-hand). */
      leaving: boolean;
    };

export const initialPresence: PresenceState = {
  serverId: null,
  seated: false,
  droppedFrom: null,
  stood: false,
  shown: null,
};

/** The next state, and the notice this event raised (null if none), so a caller can act once per notice. */
export function nextPresence(
  prev: PresenceState,
  event: PresenceEvent,
): { state: PresenceState; notice: PresenceNotice } {
  switch (event.type) {
    case "disconnect":
      return {
        state: { ...prev, droppedFrom: prev.seated ? prev.serverId : null },
        notice: null,
      };
    case "closing":
      return { state: { ...prev, shown: "restarting" }, notice: "restarting" };
    case "stand":
      return { state: { ...prev, stood: prev.seated }, notice: null };
    case "expire":
      // "restarting" holds until the table is back.
      return {
        state: {
          ...prev,
          shown: prev.shown === "restarting" ? prev.shown : null,
        },
        notice: null,
      };
    case "state": {
      const sameServer = event.serverId === prev.droppedFrom;
      // Back before the hand ended: the server keeps the seat (leaving) until results, so keep waiting.
      // Seated and not leaving means the drop never stood us up (another tab, or a fast reconnect).
      if (
        prev.droppedFrom !== null &&
        event.seated &&
        event.leaving &&
        sameServer
      ) {
        return {
          state: { ...prev, serverId: event.serverId, seated: true },
          notice: null,
        };
      }
      let notice: PresenceNotice = null;
      if (prev.droppedFrom !== null && !event.seated && !prev.stood) {
        notice = sameServer ? "disconnected" : "restarted";
      }
      // Seated again, or back from an announced restart: the old notice is done.
      const done =
        event.seated ||
        (prev.shown === "restarting" && event.serverId !== prev.serverId);
      return {
        state: {
          serverId: event.serverId,
          seated: event.seated,
          droppedFrom: null,
          stood: prev.stood && event.seated,
          shown: notice ?? (done ? null : prev.shown),
        },
        notice,
      };
    }
  }
}
