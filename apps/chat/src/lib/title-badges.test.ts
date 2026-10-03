import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let focused: boolean;
let onFocus: () => void;
let bumpTitleBadge: typeof import("./title-badges").bumpTitleBadge;

beforeEach(async () => {
  focused = false;
  vi.stubGlobal("document", {
    title: "Sandbox - General",
    hasFocus: () => focused,
  });
  vi.stubGlobal("window", {
    addEventListener: (event: string, handler: () => void) => {
      if (event === "focus") onFocus = handler;
    },
  });
  // Fresh counts, and the focus listener registered against these stubs.
  vi.resetModules();
  ({ bumpTitleBadge } = await import("./title-badges"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bumpTitleBadge", () => {
  it("counts messages and highlights ahead of the title", () => {
    bumpTitleBadge("messages");
    bumpTitleBadge("messages");
    expect(document.title).toBe("(💬 2) Sandbox - General");

    bumpTitleBadge("highlights");
    expect(document.title).toBe("(💬 2) (⭐ 1) Sandbox - General");
  });

  it("shows highlights alone when no messages came in", () => {
    bumpTitleBadge("highlights");
    expect(document.title).toBe("(⭐ 1) Sandbox - General");
  });

  it("clears on focus", () => {
    bumpTitleBadge("messages");
    bumpTitleBadge("highlights");
    onFocus();
    expect(document.title).toBe("Sandbox - General");
  });

  it("keeps the page's own title when it changes underneath", () => {
    bumpTitleBadge("messages");
    // e.g. navigating to another topic sets a new base title
    document.title = "Sandbox - Ethics";
    bumpTitleBadge("messages");
    expect(document.title).toBe("(💬 2) Sandbox - Ethics");
  });

  it("does nothing while the window is focused", () => {
    focused = true;
    bumpTitleBadge("highlights");
    expect(document.title).toBe("Sandbox - General");
  });
});
