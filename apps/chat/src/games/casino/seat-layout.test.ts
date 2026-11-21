import { describe, expect, it } from "vitest";
import { SEAT_COUNT } from "@tim/casino";
import { placeSeats, seatAngles, widestGap } from "./seat-layout";

const deg = (m: Map<number, number>) =>
  Object.fromEntries([...m].map(([seat, a]) => [seat, (a * 180) / Math.PI]));

describe("seatAngles", () => {
  it("puts one player at the bottom of the U", () => {
    expect(deg(seatAngles([4]))).toEqual({ 4: 90 });
  });

  it("spreads a few players evenly, in seat order, whatever their seat numbers", () => {
    const two = deg(seatAngles([7, 2]));
    expect(two[2]).toBeCloseTo(45);
    expect(two[7]).toBeCloseTo(135);
    const three = deg(seatAngles([3, 4, 5]));
    expect(three[3]).toBeCloseTo(30);
    expect(three[4]).toBeCloseTo(90);
    expect(three[5]).toBeCloseTo(150);
  });

  it("lays a full table out at seat·π/8, end to end", () => {
    const all = Array.from({ length: SEAT_COUNT }, (_, i) => i);
    const angles = seatAngles(all);
    for (const seat of all) {
      expect(angles.get(seat)).toBeCloseTo((seat * Math.PI) / (SEAT_COUNT - 1));
    }
  });

  it("never seats players closer than a full table's spacing", () => {
    const angles = [...seatAngles([0, 1, 2, 3, 4, 5, 6, 7]).values()];
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBeCloseTo(Math.PI / 8);
    }
  });
});

describe("widestGap", () => {
  it("picks the bottom of an empty table", () => {
    expect(widestGap([])).toBeCloseTo(Math.PI / 2);
  });

  it("picks an end when it's farther from everyone than any gap's middle", () => {
    expect(widestGap([Math.PI / 2])).toBe(0);
    expect(widestGap([0, Math.PI / 4])).toBe(Math.PI);
  });

  it("picks the middle of the widest gap", () => {
    expect(widestGap([0, Math.PI / 4, Math.PI])).toBeCloseTo((5 * Math.PI) / 8);
  });
});

describe("placeSeats", () => {
  const spread = seatAngles([2, 6]);

  it("re-spreads everyone when not held", () => {
    expect(placeSeats([2, 4, 6], spread, false)).toEqual(seatAngles([2, 4, 6]));
  });

  it("keeps everyone's spot while held, putting a newcomer in the widest gap", () => {
    const placed = placeSeats([2, 4, 6], spread, true);
    expect(placed.get(2)).toBe(spread.get(2));
    expect(placed.get(6)).toBe(spread.get(6));
    expect(placed.get(4)).toBeCloseTo(Math.PI / 2);
  });

  it("leaves the others where they are when someone stands while held", () => {
    const placed = placeSeats([2], spread, true);
    expect([...placed]).toEqual([[2, spread.get(2)]]);
  });

  it("spreads evenly while held when there's nothing to keep, like a load mid-round", () => {
    expect(placeSeats([0, 1, 2], new Map(), true)).toEqual(
      seatAngles([0, 1, 2]),
    );
  });
});
