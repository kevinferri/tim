import { describe, it, expect } from "vitest";
import { computeGivingTag, computeHighlightScore } from "./highlight-score";

describe("computeHighlightScore", () => {
  it("is highlights from others per 100 messages, lightly smoothed", () => {
    expect(
      computeHighlightScore({ messages: 980, received: 1500, given: 0 }),
    ).toEqual({ value: 150 });
  });

  it("doesn't let a tiny sample beat a strong regular", () => {
    const lucky = computeHighlightScore({
      messages: 1,
      received: 2,
      given: 0,
    })!;
    const regular = computeHighlightScore({
      messages: 200,
      received: 100,
      given: 0,
    })!;

    expect(regular.value).toBeGreaterThan(lucky.value);
  });

  it("is null for someone who hasn't posted in the circle", () => {
    expect(
      computeHighlightScore({ messages: 0, received: 0, given: 3 }),
    ).toBeNull();
  });
});

describe("computeGivingTag", () => {
  const counts = (given: number, received: number) => ({
    messages: 10,
    received,
    given,
  });

  it("tags heavy givers as generous", () => {
    expect(computeGivingTag(counts(20, 4)).kind).toBe("generous");
  });

  it("tags heavy receivers who rarely give as greedy", () => {
    expect(computeGivingTag(counts(1, 20)).kind).toBe("greedy");
  });

  it("tags moderate imbalances in an active circle", () => {
    expect(computeGivingTag(counts(400, 280)).kind).toBe("generous");
    expect(computeGivingTag(counts(280, 400)).kind).toBe("greedy");
  });

  it("tags a rough balance as even", () => {
    expect(computeGivingTag(counts(10, 12)).kind).toBe("even");
  });

  it("reads low activity as even", () => {
    expect(computeGivingTag(counts(0, 3)).kind).toBe("even");
  });

  it("smooths small samples toward even", () => {
    // 1 given vs 4 received is 4x unsmoothed, past the greedy cutoff.
    expect(computeGivingTag(counts(1, 4)).kind).toBe("even");
  });

  it("reports the counts it was given", () => {
    expect(computeGivingTag(counts(5, 7))).toEqual({
      kind: "even",
      given: 5,
      received: 7,
    });
  });
});
