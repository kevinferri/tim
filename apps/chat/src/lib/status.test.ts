import { describe, it, expect } from "vitest";
import {
  DEFAULT_STATUS_EMOJI,
  formatStatus,
  joinStatus,
  splitStatus,
} from "./status";

describe("splitStatus", () => {
  it("splits a leading emoji from the text", () => {
    expect(splitStatus("🎧 Focusing")).toEqual({
      emoji: "🎧",
      text: "Focusing",
    });
  });

  it("keeps multi-codepoint emoji whole", () => {
    expect(splitStatus("👩🏽‍💻 Coding").emoji).toBe("👩🏽‍💻");
    expect(splitStatus("❤️ Love").emoji).toBe("❤️");
  });

  it("falls back to the default emoji for plain-text statuses", () => {
    expect(splitStatus("back at 2")).toEqual({
      emoji: DEFAULT_STATUS_EMOJI,
      text: "back at 2",
    });
  });

  it("only treats a leading emoji as the status emoji", () => {
    expect(splitStatus("Lunch 🍔")).toEqual({
      emoji: DEFAULT_STATUS_EMOJI,
      text: "Lunch 🍔",
    });
  });

  it("handles empty statuses", () => {
    expect(splitStatus(null)).toEqual({
      emoji: DEFAULT_STATUS_EMOJI,
      text: "",
    });
  });
});

describe("joinStatus", () => {
  it("round-trips through splitStatus", () => {
    expect(splitStatus(joinStatus("🌴", " On vacation "))).toEqual({
      emoji: "🌴",
      text: "On vacation",
    });
  });
});

describe("formatStatus", () => {
  it("adds the default emoji to older plain-text statuses", () => {
    expect(formatStatus("in a meeting")).toBe(
      `${DEFAULT_STATUS_EMOJI} in a meeting`,
    );
  });

  it("leaves emoji statuses as they are", () => {
    expect(formatStatus("🎧 Focusing")).toBe("🎧 Focusing");
  });
});
