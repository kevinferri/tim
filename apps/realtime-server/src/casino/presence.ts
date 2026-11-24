import { TableGame, casinoStatus } from "@tim/casino";
import { CommandName } from "@tim/commands";
import { SocketEvent } from "@tim/socket-types";
import { getCircleIdsForUser, getDefaultTopicId } from "../db/circles";
import { writeMessage } from "../db/messages";
import { UserStatus, getUserStatus, setUserStatus } from "../db/users";
import { decrypt } from "../lib/encryption";
import { AppServer, SocketUser } from "../lib/socket";
import { RoomType, toRoomKey } from "../event-handlers/rooms";

export const ANNOUNCE_COOLDOWN_MS = 2 * 60 * 60 * 1000;

// The command whose result renderer draws the game's table invite.
const GAME_COMMANDS: Record<TableGame, CommandName> = {
  blackjack: CommandName.Blackjack,
};

/** Stored as a sit-down message's mediaUrl; the chat app draws the table invite from it. */
export const tablePath = (circleId: string, game: TableGame) =>
  `/circles/${encodeURIComponent(circleId)}/casino/${game}`;

/** Told when players sit and stand, so the rest of the circle hears about it. */
export interface TablePresence {
  seated(args: {
    server: AppServer;
    circleId: string;
    game: TableGame;
    user: SocketUser;
  }): Promise<void>;
  stood(args: {
    circleId: string;
    game: TableGame;
    userId: string;
  }): Promise<void>;
  /** Puts back every status still showing the casino; for shutdown. */
  restoreAll(): Promise<void>;
}

export const noopPresence: TablePresence = {
  seated: async () => {},
  stood: async () => {},
  restoreAll: async () => {},
};

type Seated = {
  server: AppServer;
  displayName: string;
  /** Every table this user sits at; the status comes back when the last one frees. */
  tables: Set<string>;
  previous: UserStatus;
  status: string;
};

export function createTablePresence(now = () => Date.now()): TablePresence {
  const seatedUsers = new Map<string, Seated>();
  const lastAnnounced = new Map<string, number>();
  // Per user, so a stand can't overtake the sit whose status it restores.
  const queues = new Map<string, Promise<void>>();
  // Set by restoreAll: a sit queued after shutdown starts must not write a status nothing will restore.
  let closing = false;

  const enqueue = (userId: string, op: () => Promise<void>) => {
    const next = (queues.get(userId) ?? Promise.resolve())
      .then(op)
      .catch((err) => console.error("casino: presence update failed", err));
    queues.set(userId, next);
    next.finally(() => {
      if (queues.get(userId) === next) queues.delete(userId);
    });
    return next;
  };

  const broadcastStatus = async (
    server: AppServer,
    user: { id: string; displayName: string } & UserStatus,
  ) => {
    const lastStatusUpdate = user.lastStatusUpdate
      ? new Date(user.lastStatusUpdate)
      : null;
    const userRoomKey = toRoomKey({ id: user.id, roomType: RoomType.User });
    // New messages and presence snapshots are stamped with each socket's copy.
    for (const s of await server.in(userRoomKey).fetchSockets()) {
      s.data.user = {
        ...s.data.user,
        status: user.status,
        lastStatusUpdate: lastStatusUpdate?.toISOString() ?? null,
      };
    }
    const circleRoomKeys = (await getCircleIdsForUser({ userId: user.id })).map(
      (id) => toRoomKey({ id, roomType: RoomType.Circle }),
    );
    server
      .to([...circleRoomKeys, userRoomKey])
      .emit(SocketEvent.UserUpdatedStatus, {
        user: {
          id: user.id,
          displayName: user.displayName,
          status: user.status,
          lastStatusUpdate,
        },
        // Not something they set: the chat app updates it without the "updated their status" toast.
        automatic: true,
      });
  };

  const announce = async (
    server: AppServer,
    circleId: string,
    game: TableGame,
    user: SocketUser,
  ) => {
    if (closing) return;
    const key = `${circleId}:${user.id}`;
    const last = lastAnnounced.get(key);
    if (last !== undefined && now() - last < ANNOUNCE_COOLDOWN_MS) return;
    // Claimed before any await so two quick sits can't both post.
    const claimedAt = now();
    lastAnnounced.set(key, claimedAt);

    let saved: Awaited<ReturnType<typeof writeMessage>>;
    try {
      const topicId = await getDefaultTopicId({ circleId });
      if (!topicId) return;
      saved = await writeMessage({
        userId: user.id,
        topicId,
        // No text: the chat app draws the whole invite from mediaUrl.
        text: "",
        mediaUrl: tablePath(circleId, game),
        command: GAME_COMMANDS[game],
      });
    } catch (err) {
      // Nothing was posted, so the next sit may try again (unless a newer claim replaced this one).
      if (lastAnnounced.get(key) === claimedAt) lastAnnounced.delete(key);
      throw err;
    }
    server
      .to(toRoomKey({ id: circleId, roomType: RoomType.Circle }))
      .emit(SocketEvent.SendMessage, {
        ...saved,
        circleId,
        text: decrypt(saved.text, saved.id),
        sentBy: user,
        createdAt: saved.createdAt ?? new Date(),
        highlights: [],
      });
  };

  const restore = async (userId: string, seated: Seated) => {
    const restored = await setUserStatus({
      userId,
      ...seated.previous,
      ifStatus: seated.status,
    });
    // They set their own status while seated: theirs wins.
    if (!restored) return;
    await broadcastStatus(seated.server, {
      id: userId,
      displayName: seated.displayName,
      ...seated.previous,
    });
  };

  return {
    async seated({ server, circleId, game, user }) {
      const tableKey = `${game}:${circleId}`;
      await Promise.all([
        announce(server, circleId, game, user).catch((err) =>
          console.error("casino: sit announcement failed", err),
        ),
        enqueue(user.id, async () => {
          if (closing) return;
          const existing = seatedUsers.get(user.id);
          if (existing) {
            existing.tables.add(tableKey);
            return;
          }
          const current = await getUserStatus({ userId: user.id });
          if (!current) return;
          const status = casinoStatus(game);
          // Left over from a crash mid-session: nothing worth restoring.
          const previous =
            current.status === status
              ? { status: null, lastStatusUpdate: null }
              : current;
          seatedUsers.set(user.id, {
            server,
            displayName: user.displayName,
            tables: new Set([tableKey]),
            previous,
            status,
          });
          const lastStatusUpdate = new Date(now());
          await setUserStatus({ userId: user.id, status, lastStatusUpdate });
          await broadcastStatus(server, {
            id: user.id,
            displayName: user.displayName,
            status,
            lastStatusUpdate,
          });
        }),
      ]);
    },

    stood({ circleId, game, userId }) {
      return enqueue(userId, async () => {
        const seated = seatedUsers.get(userId);
        if (!seated?.tables.delete(`${game}:${circleId}`)) return;
        if (seated.tables.size > 0) return;
        seatedUsers.delete(userId);
        await restore(userId, seated);
      });
    },

    async restoreAll() {
      closing = true;
      // A sit already past the closing check finishes first, so it's restored too.
      await Promise.allSettled([...queues.values()]);
      await Promise.all(
        [...seatedUsers.keys()].map((userId) =>
          enqueue(userId, async () => {
            const seated = seatedUsers.get(userId);
            if (!seated) return;
            seatedUsers.delete(userId);
            await restore(userId, seated);
          }),
        ),
      );
    },
  };
}
