"use client";

import { useEffect, useState } from "react";
import type { SeatOccupant, TableRef, TableWatchPayload } from "@tim/casino";
import { useSocketContext } from "@/components/socket/socket-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

type SeatsSnapshot = TableRef & {
  seats: ({ occupant: SeatOccupant } | null)[];
};

/** Who's seated at a table, live; null until the first snapshot. Spectates, so it can't sit and doesn't keep anyone seated. */
export function useTableSeats({ circleId, game }: TableRef) {
  const { socket } = useSocketContext();
  const [occupants, setOccupants] = useState<SeatOccupant[] | null>(null);

  useEffect(() => {
    const watch = () =>
      socket.emit(SocketEvent.TableWatch, {
        circleId,
        game,
        spectate: true,
      } satisfies TableWatchPayload);
    if (socket.connected) watch();
    socket.on("connect", watch);
    return () => {
      socket.off("connect", watch);
      socket.emit(SocketEvent.TableUnwatch, { circleId, game } as TableRef);
    };
  }, [socket, circleId, game]);

  useSocketHandler<SeatsSnapshot>(SocketEvent.TableState, (next) => {
    if (next.circleId !== circleId || next.game !== game) return;
    setOccupants(next.seats.flatMap((s) => (s ? [s.occupant] : [])));
  });

  return occupants;
}
