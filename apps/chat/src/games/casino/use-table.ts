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

// Fallback for an action the server never answered, so the controls can't stay locked.
const ACTION_TIMEOUT_MS = 3000;

/** Shown on the table in place of its status (short: the status line is one line); the app's own toasts cover the connection itself. */
export const TABLE_NOTICES = {
  restarting: "Table restarting",
  restarted: "Table restarted",
  disconnected: "You were disconnected",
};
export type TableNotice = keyof typeof TABLE_NOTICES;

// How long a seat-lost notice holds the status before the table's own comes back.
const NOTICE_MS = 6_000;

type TableViewBase = {
  circleId: string;
  game: TableGame;
  serverId: string;
  msLeft: number | null;
  phase: string;
  turn: unknown;
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

  // One action in flight at a time: a double tap or a bet racing the auto-bet sends only once.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What my last action can change; another player's move leaves it alone, so it doesn't unlock.
  const actedOn = useRef<string | null>(null);
  const settle = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
  }, []);
  useEffect(() => settle, [settle]);

  const [notice, setNotice] = useState<TableNotice | null>(null);
  // "restarting" holds until the table is back; the others clear themselves.
  useEffect(() => {
    if (!notice || notice === "restarting") return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const presence = useRef<PresenceState>(initialPresence);
  // Stable, so the watch effect below doesn't re-run because of it.
  const onPresence = useCallback((event: PresenceEvent) => {
    const { state, notice } = nextPresence(presence.current, event);
    presence.current = state;
    if (notice) setNotice(notice);
  }, []);

  const isThisTable = (p: { circleId: string; game: string }) =>
    p.circleId === circleId && p.game === game;

  useEffect(() => {
    const watch = () =>
      socket.emit(SocketEvent.TableWatch, { circleId, game } as TableRef);
    const onConnect = () => watch();
    const onDisconnect = () => {
      settle();
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
  }, [socket, circleId, game, onPresence, settle]);

  useSocketHandler<View>(SocketEvent.TableState, (next) => {
    if (!isThisTable(next)) return;
    const mine = next.seats.find((s) => s?.occupant.userId === self.id);
    const key = JSON.stringify([mine, next.phase, next.turn]);
    if (key !== actedOn.current) settle();
    actedOn.current = key;
    // Back from a restart, or seated again after losing the seat: the notice is done.
    if (mine) setNotice(null);
    else setNotice((n) => (n === "restarting" ? null : n));
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
    settle();
    if (payload.code === "game_off") return setStatus("off");
    toast({ title: payload.message, variant: "quiet-destructive" });
  });

  useSocketHandler<TableClosingPayload>(SocketEvent.TableClosing, (payload) => {
    if (!isThisTable(payload)) return;
    onPresence({ type: "closing" });
    setNotice("restarting");
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

  const stand = useCallback(() => {
    onPresence({ type: "stand" });
    socket.emit(SocketEvent.TableStand, { circleId, game } as TableRef);
  }, [socket, circleId, game, onPresence]);

  const act = useCallback(
    (action: Action) => {
      if (pending.current) return;
      pending.current = setTimeout(settle, ACTION_TIMEOUT_MS);
      socket.emit(SocketEvent.TableAction, { circleId, game, action });
    },
    [socket, circleId, game, settle],
  );

  const mySeat = view
    ? view.seats.findIndex((s) => s?.occupant.userId === self.id)
    : -1;

  return {
    view,
    status,
    deadline,
    notice,
    mySeat: mySeat === -1 ? null : mySeat,
    selfId: self.id,
    sit,
    stand,
    act,
  };
}
