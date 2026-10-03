import { useMessageSound } from "@/components/dashboard/use-message-sound";

// Synthesized rather than audio files: nothing to fetch, and they're ready the instant they're needed.
let context: AudioContext | null = null;

// Browsers only let audio start after a user gesture (Safari: inside one), so unlock on the first.
function unlock() {
  if (!window.AudioContext) return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
}

function ready() {
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

// E6 then B6: a bright, soft two-note "ding" for a highlight given or received.
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
