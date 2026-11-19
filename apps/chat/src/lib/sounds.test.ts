import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A context that stays suspended until the test calls resumed(), which settles every pending resume()
// at once, as a real context does when it starts.
class FakeAudioContext {
  state: "suspended" | "running" = "suspended";
  private pending: (() => void)[] = [];
  resume() {
    return new Promise<void>((done) => this.pending.push(done));
  }
  resumed() {
    this.state = "running";
    this.pending.splice(0).forEach((done) => done());
  }
}

let gesture = false;

async function load() {
  vi.resetModules();
  vi.stubGlobal("window", {
    AudioContext: FakeAudioContext,
    addEventListener: () => undefined,
  });
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("navigator", {
    userActivation: {
      get isActive() {
        return gesture;
      },
    },
  });
  const sounds = await import("./sounds");
  const ctx = sounds.audioContext() as unknown as FakeAudioContext;
  return { ...sounds, ctx };
}

beforeEach(() => {
  gesture = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("whenReady", () => {
  it("plays right away once audio is running", async () => {
    const { whenReady, ctx } = await load();
    ctx.state = "running";
    const play = vi.fn();
    whenReady(play);
    expect(play).toHaveBeenCalledOnce();
  });

  it("drops a sound while audio is locked and no gesture is happening", async () => {
    const { whenReady, ctx } = await load();
    const play = vi.fn();
    whenReady(play);
    // The first click later unlocks audio: the sound from before it must not play then.
    gesture = true;
    whenReady(() => undefined);
    ctx.resumed();
    await Promise.resolve();
    await Promise.resolve();
    expect(play).not.toHaveBeenCalled();
  });

  it("waits for the gesture that unlocks audio, then plays", async () => {
    const { whenReady, ctx } = await load();
    gesture = true;
    const play = vi.fn();
    whenReady(play);
    expect(play).not.toHaveBeenCalled();
    ctx.resumed();
    await vi.waitFor(() => expect(play).toHaveBeenCalledOnce());
  });
});
