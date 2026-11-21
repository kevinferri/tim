// Where seated players sit around the U, as angles: 0 is first base (beside the dealer on the viewer's right), π the far left.
import { SEAT_COUNT } from "@tim/casino";

// A full table's spacing, the closest seats ever sit.
const FULL_STEP = Math.PI / (SEAT_COUNT - 1);

/** Where each of these seats sits: spread evenly around the middle of the U, in seat order, so a few players fill the table rather than leaving gaps. */
export function seatAngles(seats: number[]) {
  const sorted = [...seats].sort((a, b) => a - b);
  const n = sorted.length;
  // π/n leaves half a step free at each end; a full table reaches the ends.
  const step = Math.max(FULL_STEP, Math.PI / n);
  return new Map(
    sorted.map((seat, k) => [seat, Math.PI / 2 + (k - (n - 1) / 2) * step]),
  );
}

/** The open angle farthest from every taken one: an end of the U, or the middle of the widest gap. */
export function widestGap(taken: number[]) {
  if (!taken.length) return Math.PI / 2;
  const sorted = [...taken].sort((a, b) => a - b);
  let best = { angle: 0, room: sorted[0] };
  const endRoom = Math.PI - sorted[sorted.length - 1];
  if (endRoom > best.room) best = { angle: Math.PI, room: endRoom };
  for (let i = 1; i < sorted.length; i++) {
    const room = (sorted[i] - sorted[i - 1]) / 2;
    // A tie goes to the gap, keeping the table compact rather than reaching for the dealer's sides.
    if (room >= best.room) {
      best = { angle: (sorted[i] + sorted[i - 1]) / 2, room };
    }
  }
  return best.angle;
}

/** Spots for these seats: spread evenly, or while held, kept where they were so hands and chip flights mid-round don't move. */
export function placeSeats(
  seats: number[],
  prev: Map<number, number>,
  hold: boolean,
) {
  // Nothing to keep (a load or first snapshot mid-round): spread, as the cards were sized for.
  if (!hold || !seats.some((seat) => prev.has(seat))) return seatAngles(seats);
  const placed = new Map([...prev].filter(([seat]) => seats.includes(seat)));
  for (const seat of [...seats].sort((a, b) => a - b)) {
    if (!placed.has(seat)) placed.set(seat, widestGap([...placed.values()]));
  }
  return placed;
}
