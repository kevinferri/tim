import { useMessageSound } from "@/components/dashboard/use-message-sound";

// Synthesized rather than audio files: nothing to fetch, and they're ready the instant they're needed.
let context: AudioContext | null = null;

// Browsers only let audio start after a user gesture (Safari: inside one), so unlock on the first.
function unlock() {
  const ctx = audioContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

/** The shared context, created on demand (suspended until a gesture unlocks it), e.g. to decode audio files ahead of time. */
export function audioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  context ??= new AudioContext();
  return context;
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
}

/**
 * Runs `play` with the shared context as soon as a sound may play: right away if it's running, or once
 * it finishes starting up (the gesture that unlocks it can be the very one that triggers the sound).
 */
export function whenReady(play: (ctx: AudioContext) => void) {
  const ctx = audioContext();
  if (!ctx || !useMessageSound.getState().isMessageSoundEnabled) return;
  if (ctx.state === "running") return play(ctx);
  void ctx.resume().then(
    () => ctx.state === "running" && play(ctx),
    () => undefined,
  );
}

/** The shared context when a sound may play right now: unlocked, with sounds turned on. */
export function ready() {
  if (!context || context.state !== "running") return null;
  if (!useMessageSound.getState().isMessageSoundEnabled) return null;
  return context;
}

type Tone = {
  frequency: number;
  // Glides up to this over the first part of the note, for a "bloop".
  glideTo?: number;
  delay: number;
  peak: number;
  decay: number;
};

function play(ctx: AudioContext, tones: Tone[]) {
  const start = ctx.currentTime;
  for (const tone of tones) {
    const at = start + tone.delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, at);
    if (tone.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        tone.glideTo,
        at + 0.07,
      );
    }
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(tone.peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.decay);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + tone.decay);
  }
}

// E6 then B6: a bright, soft two-note "ding" for a highlight received while away.
export function playHighlightChime() {
  const ctx = ready();
  if (!ctx) return;
  play(ctx, [
    { frequency: 1318.5, delay: 0, peak: 0.07, decay: 0.35 },
    { frequency: 1975.5, delay: 0.07, peak: 0.05, decay: 0.35 },
  ]);
}

// A soft, low bubble "boop" for an incoming message, with a faint overtone for roundness.
export function playMessagePop() {
  const ctx = ready();
  if (!ctx) return;
  play(ctx, [
    { frequency: 360, glideTo: 640, delay: 0, peak: 0.1, decay: 0.21 },
    { frequency: 1280, delay: 0.045, peak: 0.015, decay: 0.13 },
  ]);
}
