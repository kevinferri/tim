import { describe, it, expect } from "vitest";
import { computeGivingTag, computeHighlightScore } from "./highlight-score";

describe("computeHighlightScore", () => {
  it("doesn't let a tiny sample beat a strong regular", () => {
    const members = [
      { userId: "lucky", messages: 1, highlights: 2, given: 0 },
      { userId: "regular", messages: 200, highlights: 100, given: 0 },
      { userId: "quiet", messages: 200, highlights: 20, given: 0 },
    ];

    const lucky = computeHighlightScore(members, "lucky")!;
    const regular = computeHighlightScore(members, "regular")!;

    expect(regular.multiplier).toBeGreaterThan(lucky.multiplier);
    expect(regular.topPercent).toBe(33);
  });

  it("is 1x the average for a member exactly at the circle rate", () => {
    const members = [
      { userId: "a", messages: 10, highlights: 5, given: 0 },
      { userId: "b", messages: 10, highlights: 5, given: 0 },
    ];

    expect(computeHighlightScore(members, "a")!.multiplier).toBeCloseTo(1);
  });

  it("ranks the top member in the top 1/N", () => {
    const members = [
      { userId: "a", messages: 50, highlights: 40, given: 0 },
      { userId: "b", messages: 50, highlights: 10, given: 0 },
      { userId: "c", messages: 50, highlights: 5, given: 0 },
      { userId: "d", messages: 50, highlights: 1, given: 0 },
    ];

    expect(computeHighlightScore(members, "a")!.topPercent).toBe(25);
    expect(computeHighlightScore(members, "d")!.topPercent).toBe(100);
    expect(computeHighlightScore(members, "d")!.bottomPercent).toBe(25);
    expect(computeHighlightScore(members, "a")!.place).toBe(1);
    expect(computeHighlightScore(members, "d")!.place).toBe(4);
  });

  it("gives tied members the same rank", () => {
    const members = [
      { userId: "a", messages: 10, highlights: 5, given: 0 },
      { userId: "b", messages: 10, highlights: 5, given: 0 },
    ];

    expect(computeHighlightScore(members, "a")!.topPercent).toBe(50);
    expect(computeHighlightScore(members, "b")!.topPercent).toBe(50);
  });

  it("returns null for someone who hasn't posted in the circle", () => {
    const members = [
      { userId: "a", messages: 10, highlights: 5, given: 0 },
      { userId: "lurker", messages: 0, highlights: 0, given: 0 },
    ];

    expect(computeHighlightScore(members, "lurker")).toBeNull();
  });

  it("returns null when nobody in the circle has been highlighted", () => {
    const members = [{ userId: "a", messages: 10, highlights: 0, given: 0 }];

    expect(computeHighlightScore(members, "a")).toBeNull();
  });
});

describe("computeGivingTag", () => {
  const member = (given: number, highlights: number) => [
    { userId: "me", messages: 10, highlights, given },
  ];

  it("tags heavy givers as generous", () => {
    expect(computeGivingTag(member(20, 4), "me")?.kind).toBe("generous");
  });

  it("tags heavy receivers who rarely give as greedy", () => {
    expect(computeGivingTag(member(1, 20), "me")?.kind).toBe("greedy");
  });

  it("tags a rough balance as even", () => {
    expect(computeGivingTag(member(10, 12), "me")?.kind).toBe("even");
  });

  it("reads low activity as even", () => {
    expect(computeGivingTag(member(0, 3), "me").kind).toBe("even");
  });

  it("smooths small samples toward even", () => {
    // 1 given vs 4 received is 4x unsmoothed, past the greedy cutoff.
    expect(computeGivingTag(member(1, 4), "me")?.kind).toBe("even");
  });

  it("tags someone with no activity in the circle as even", () => {
    expect(computeGivingTag(member(5, 5), "someone-else")).toEqual({
      kind: "even",
      given: 0,
      received: 0,
    });
  });
});
