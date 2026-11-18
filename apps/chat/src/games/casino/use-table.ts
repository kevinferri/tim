"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SeatOccupant,
  TableClosingPayload,
  TableErrorPayload,
  TableGame,
  TableRef,
  TableSitPayload,
} from "@tim/casino";
import { useSocketContext } from "@/components/socket/socket-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useSelf } from "@/components/auth/self-provider";
import { useToast } from "@/components/ui/use-toast";
import {
  initialPresence,
  nextPresence,
  type PresenceEvent,
  type PresenceState,
} from "./table-presence";

const NOTICES = {
  restarted:
    "The table restarted. Your bet was returned. Join the table to keep playing.",
  disconnected:
    "You were disconnected and left the table. Join the table to keep playing.",
};

type TableViewBase = {
  circleId: string;
  game: TableGame;
  serverId: string;
  msLeft: number | null;
  seats: ({ occupant: SeatOccupant; leaving: boolean } | null)[];
};

export type TableStatus = "joining" | "live" | "reconnecting" | "off";

/** Watches one live table: snapshots, reconnects, errors, and intents. */
export function useTable<View extends TableViewBase, Action>(ref: TableRef) {
  const { circleId, game } = ref;
  const { socket } = useSocketContext();
  const self = useSelf();
  const { toast } = useToast();
  const [view, setView] = useState<View | null>(null);
  const [status, setStatus] = useState<TableStatus>("joining");
  // performance.now() deadline for view.msLeft, so countdowns don't depend on clock skew.
  const [deadline, setDeadline] = useState<number | null>(null);

  const presence = useRef<PresenceState>(initialPresence);
  // Stable (toast is), so the watch effect below doesn't re-run because of it.
  const onPresence = useCallback(
    (event: PresenceEvent) => {
      const { state, notice } = nextPresence(presence.current, event);
      presence.current = state;
      if (notice) toast({ title: NOTICES[notice] });
    },
    [toast],
  );

  const isThisTable = (p: { circleId: string; game: string }) =>
    p.circleId === circleId && p.game === game;

  useEffect(() => {
    const watch = () =>
      socket.emit(SocketEvent.TableWatch, { circleId, game } as TableRef);
    const onConnect = () => watch();
    const onDisconnect = () => {
      onPresence({ type: "disconnect" });
      setStatus((s) => (s === "off" ? s : "reconnecting"));
    };

    // Every reconnect is a new server connection, so watch again on each one.
    if (socket.connected) watch();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.emit(SocketEvent.TableUnwatch, { circleId, game } as TableRef);
    };
  }, [socket, circleId, game, onPresence]);

  useSocketHandler<View>(SocketEvent.TableState, (next) => {
    if (!isThisTable(next)) return;
    const mine = next.seats.find((s) => s?.occupant.userId === self.id);
    onPresence({
      type: "state",
      serverId: next.serverId,
      seated: !!mine,
      leaving: !!mine?.leaving,
    });

    setView(next);
    setDeadline(next.msLeft === null ? null : performance.now() + next.msLeft);
    setStatus("live");
  });

  useSocketHandler<TableErrorPayload>(SocketEvent.TableError, (payload) => {
    if (!isThisTable(payload)) return;
    if (payload.code === "game_off") return setStatus("off");
    toast({ title: payload.message, variant: "quiet-destructive" });
  });

  useSocketHandler<TableClosingPayload>(SocketEvent.TableClosing, (payload) => {
    if (!isThisTable(payload)) return;
    onPresence({ type: "closing" });
    toast({ title: payload.message });
  });

  const sit = useCallback(
    // No seat = the server picks the first free one.
    (seat?: number) =>
      socket.emit(SocketEvent.TableSit, {
        circleId,
        game,
        seat,
      } as TableSitPayload),
    [socket, circleId, game],
  );

  const stand = useCallback(
    () => socket.emit(SocketEvent.TableStand, { circleId, game } as TableRef),
    [socket, circleId, game],
  );

  const act = useCallback(
    (action: Action) =>
      socket.emit(SocketEvent.TableAction, { circleId, game, action }),
    [socket, circleId, game],
  );

  const mySeat = view
    ? view.seats.findIndex((s) => s?.occupant.userId === self.id)
    : -1;

  return {
    view,
    status,
    deadline,
    mySeat: mySeat === -1 ? null : mySeat,
    selfId: self.id,
    sit,
    stand,
    act,
  };
}
