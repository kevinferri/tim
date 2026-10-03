import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flashTitle } from "./title-alert";

let focused: boolean;
let onFocus: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  focused = false;
  onFocus = undefined;
  vi.stubGlobal("document", {
    title: "Sandbox - General",
    hasFocus: () => focused,
  });
  vi.stubGlobal("window", {
    addEventListener: (event: string, handler: () => void) => {
      if (event === "focus") onFocus = handler;
    },
  });
});

afterEach(() => {
  onFocus?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("flashTitle", () => {
  it("alternates with the page title until the window is focused", () => {
    flashTitle("⭐ Kevin highlighted your message");
    expect(document.title).toBe("⭐ Kevin highlighted your message");

    vi.advanceTimersByTime(1500);
    expect(document.title).toBe("Sandbox - General");
    vi.advanceTimersByTime(1500);
    expect(document.title).toBe("⭐ Kevin highlighted your message");

    onFocus!();
    expect(document.title).toBe("Sandbox - General");
    vi.advanceTimersByTime(3000);
    expect(document.title).toBe("Sandbox - General");
  });

  it("picks up title changes made by the page while flashing", () => {
    flashTitle("⭐ Kevin highlighted your message");
    // e.g. the unread count bumping while the alert is showing
    document.title = "(1) Sandbox - General";

    vi.advanceTimersByTime(1500);
    expect(document.title).toBe("⭐ Kevin highlighted your message");
    vi.advanceTimersByTime(1500);
    expect(document.title).toBe("(1) Sandbox - General");
  });

  it("does nothing while the window is focused", () => {
    focused = true;
    flashTitle("⭐ Kevin highlighted your message");
    expect(document.title).toBe("Sandbox - General");
  });
});
