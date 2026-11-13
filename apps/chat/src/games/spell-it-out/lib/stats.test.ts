import { describe, expect, it } from "vitest";
import { computeStats, type PlaySummary } from "./stats";

const win = (gameDate: string, guessCount = 3): PlaySummary => ({
  gameDate,
  guessCount,
  solved: true,
  finished: true,
});
const loss = (gameDate: string): PlaySummary => ({
  gameDate,
  guessCount: 6,
  solved: false,
  finished: true,
});

describe("computeStats", () => {
  it("is empty with no plays", () => {
    expect(computeStats([], "2026-11-13")).toEqual({
      played: 0,
      solved: 0,
      currentStreak: 0,
      bestStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0],
    });
  });

  it("counts a streak ending today", () => {
    const stats = computeStats(
      [win("2026-11-11"), win("2026-11-12", 2), win("2026-11-13", 4)],
      "2026-11-13",
    );
    expect(stats.currentStreak).toBe(3);
    expect(stats.bestStreak).toBe(3);
    expect(stats.distribution).toEqual([0, 1, 1, 1, 0, 0]);
  });

  it("keeps the streak alive while today is unplayed or in progress", () => {
    const inProgress = {
      gameDate: "2026-11-13",
      guessCount: 2,
      solved: false,
      finished: false,
    };
    const stats = computeStats(
      [win("2026-11-11"), win("2026-11-12"), inProgress],
      "2026-11-13",
    );
    expect(stats.currentStreak).toBe(2);
    expect(stats.played).toBe(2);
  });

  it("breaks on a loss or a skipped weekday, keeping the best", () => {
    const stats = computeStats(
      [
        win("2026-11-02"),
        win("2026-11-03"),
        win("2026-11-04"),
        loss("2026-11-05"),
        win("2026-11-06"),
        win("2026-11-10"),
      ],
      "2026-11-10",
    );
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(3);
    expect(stats.played).toBe(6);
    expect(stats.solved).toBe(5);
  });

  it("drops to zero as soon as today is lost", () => {
    const stats = computeStats(
      [
        win("2026-11-09"),
        win("2026-11-10"),
        win("2026-11-11"),
        win("2026-11-12"),
        loss("2026-11-13"),
      ],
      "2026-11-13",
    );
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(4);
  });

  it("drops to zero once a day is missed", () => {
    expect(computeStats([win("2026-11-10")], "2026-11-13").currentStreak).toBe(
      0,
    );
  });

  it("streaks across month and DST boundaries", () => {
    const stats = computeStats(
      [win("2026-10-29"), win("2026-10-30"), win("2026-11-02")],
      "2026-11-02",
    );
    expect(stats.currentStreak).toBe(3);
  });

  it("doesn't break over a weekend, and holds through one", () => {
    const fridayStreak = [win("2026-11-12"), win("2026-11-13")];
    expect(computeStats(fridayStreak, "2026-11-14").currentStreak).toBe(2);
    expect(computeStats(fridayStreak, "2026-11-15").currentStreak).toBe(2);
    expect(computeStats(fridayStreak, "2026-11-16").currentStreak).toBe(2);
    expect(
      computeStats([...fridayStreak, win("2026-11-16")], "2026-11-16")
        .currentStreak,
    ).toBe(3);
    expect(computeStats(fridayStreak, "2026-11-17").currentStreak).toBe(0);
  });
});
