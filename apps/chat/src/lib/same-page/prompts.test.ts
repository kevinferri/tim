import { describe, expect, it } from "vitest";
import { SAME_PAGE_PROMPTS, pickPrompt } from "@/lib/same-page/prompts";

describe("pickPrompt", () => {
  it("is stable for the same circle and date", () => {
    expect(pickPrompt("circle-a", "2026-11-10")).toBe(
      pickPrompt("circle-a", "2026-11-10"),
    );
  });

  it("gives different prompts on consecutive days", () => {
    const a = pickPrompt("circle-a", "2026-11-10");
    const b = pickPrompt("circle-a", "2026-11-11");
    expect(a).not.toBe(b);
  });

  it("does not repeat within the bank length for one circle", () => {
    const start = Date.UTC(2026, 10, 10); // Nov 10
    const seen = new Set<string>();
    for (let i = 0; i < SAME_PAGE_PROMPTS.length; i++) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      seen.add(pickPrompt("circle-a", date));
    }
    expect(seen.size).toBe(SAME_PAGE_PROMPTS.length);
  });

  it("can differ across circles on the same day", () => {
    // Not required for every pair, but offset should often diverge.
    const prompts = ["c1", "c2", "c3", "c4", "c5"].map((id) =>
      pickPrompt(id, "2026-11-10"),
    );
    expect(new Set(prompts).size).toBeGreaterThan(1);
  });
});
