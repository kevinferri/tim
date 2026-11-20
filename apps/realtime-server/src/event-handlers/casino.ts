import {
  BlackjackTableAction,
  SEAT_COUNT,
  TableErrorCode,
  TableErrorPayload,
  TableRef,
} from "@tim/casino";
import { isUserInCircle } from "../db/circles";
import { isGameEnabled } from "../db/circle-games";
import { CasinoRegistry, casinoRegistry } from "../casino/registry";
import { AppSocket } from "../lib/socket";
import { HandlerArgs, SocketEvent } from "./main";
import { enqueueRoomOp } from "./rooms";

const ACTION_TYPES = ["bet", "hit", "stand", "double", "split"];

function parseRef(payload: any): TableRef | null {
  if (
    !payload ||
    typeof payload.circleId !== "string" ||
    !payload.circleId ||
    payload.game !== "blackjack"
  ) {
    return null;
  }
  return { circleId: payload.circleId, game: payload.game };
}

function parseAction(action: any): BlackjackTableAction | null {
  if (!action || !ACTION_TYPES.includes(action.type)) return null;
  if (action.type === "bet") {
    return Number.isInteger(action.amount)
      ? { type: "bet", amount: action.amount }
      : null;
  }
  return { type: action.type };
}

function emitError(
  socket: AppSocket,
  ref: TableRef,
  message: string | null,
  code?: TableErrorCode,
) {
  if (!message) return;
  const payload: TableErrorPayload = { ...ref, message, code };
  socket.emit(SocketEvent.TableError, payload);
}

export function handleCasino(args: HandlerArgs) {
  registerCasinoHandlers(args, casinoRegistry);
}

export function registerCasinoHandlers(
  { socket }: HandlerArgs,
  registry: CasinoRegistry,
) {
  const user = () => socket.data.user;

  // A throw in a listener would crash the whole server, taking chat down with it.
  const reportingErrors = async (
    event: SocketEvent,
    payload: unknown,
    fn: (payload: any) => unknown,
  ) => {
    try {
      await fn(payload);
    } catch (err) {
      console.error(`casino: ${event} failed`, err);
      const ref = parseRef(payload);
      if (ref) emitError(socket, ref, "Something went wrong. Try again.");
    }
  };

  const on = (event: SocketEvent, fn: (payload: any) => unknown) =>
    socket.on(event, (payload: unknown) => reportingErrors(event, payload, fn));

  // Shares rooms.ts's per-socket queue so an unwatch can't overtake a watch still awaiting its checks.
  // Errors are reported inside the op because enqueueRoomOp only logs them.
  const queued = (event: SocketEvent, fn: (payload: any) => unknown) =>
    socket.on(event, (payload: unknown) =>
      enqueueRoomOp(socket, () => reportingErrors(event, payload, fn)),
    );

  // Sit/stand/act are only for sockets already watching (authorized at watch).
  const watchedTable = (ref: TableRef) => {
    const table = registry.get(ref.circleId, ref.game);
    if (!table || !table.isWatching(socket.id)) {
      emitError(socket, ref, "You're not at this table");
      return null;
    }
    return table;
  };

  queued(SocketEvent.TableWatch, async (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    const [isMember, enabled] = await Promise.all([
      isUserInCircle({ userId: user().id, circleId: ref.circleId }),
      isGameEnabled({ circleId: ref.circleId, gameId: ref.game }),
    ]);
    // Disconnected mid-check: adding it now would leave a watcher nothing removes.
    if (!socket.connected) return;
    if (!isMember) return emitError(socket, ref, "Not a member of this circle");
    if (!enabled) {
      return emitError(
        socket,
        ref,
        "This game isn't on in this circle",
        "game_off",
      );
    }
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    registry.getOrCreate(ref.circleId, ref.game).addWatcher(socket);
  });

  queued(SocketEvent.TableUnwatch, (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    registry.get(ref.circleId, ref.game)?.removeWatcher(socket.id);
  });

  on(SocketEvent.TableSit, async (payload: any) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const anySeat = payload.seat === undefined;
    const seat = payload.seat;
    if (
      !anySeat &&
      (!Number.isInteger(seat) || seat < 0 || seat >= SEAT_COUNT)
    ) {
      return emitError(socket, ref, "Invalid seat");
    }
    const table = watchedTable(ref);
    if (!table) return;
    const { id, name, displayName, imageUrl, createdAt } = user();
    if (table.seatIndexOf(id) !== null) {
      return emitError(socket, ref, "You already have a seat");
    }
    if (anySeat ? table.nextFreeSeat() === null : !table.isSeatFree(seat)) {
      return emitError(
        socket,
        ref,
        anySeat ? "Table is full" : "Seat is taken",
      );
    }

    let net: number;
    try {
      // A settlement still being written would otherwise load stale.
      await registry.writesSettled(ref.circleId, id);
      net = await registry.deps.netStore.load(ref.circleId, id);
    } catch (err) {
      console.error("casino: up/down load failed", err);
      return emitError(socket, ref, "Couldn't load your up/down. Try again.");
    }
    // Re-checked after the await: the socket may have left or the table closed.
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    const current = watchedTable(ref);
    if (!current) return;
    // Picked after the await so two joins at once don't race for one seat.
    const target = anySeat ? current.nextFreeSeat() : seat;
    if (target === null) return emitError(socket, ref, "Table is full");
    emitError(
      socket,
      ref,
      current.sit(
        { userId: id, name, displayName, imageUrl, createdAt },
        target,
        net,
      ),
    );
  });

  on(SocketEvent.TableStand, (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const table = watchedTable(ref);
    if (table) emitError(socket, ref, table.stand(user().id));
  });

  on(SocketEvent.TableAction, (payload: any) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const action = parseAction(payload.action);
    if (!action) return emitError(socket, ref, "Invalid action");
    const table = watchedTable(ref);
    if (table) emitError(socket, ref, table.act(user().id, action));
  });

  on(SocketEvent.Disconnecting, () => {
    registry.removeSocket(socket.id);
  });
}
