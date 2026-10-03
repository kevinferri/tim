import { useMessageSound } from "@/components/dashboard/use-message-sound";

// Synthesized rather than an audio file: nothing to fetch, and it's ready the instant it's needed.
let context: AudioContext | null = null;

// Call from the click/tap itself: Safari only lets audio start inside a user gesture.
export function primeHighlightChime() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
}

// E6 then B6: a bright, soft two-note "ding".
const NOTES = [
  { frequency: 1318.5, delay: 0, peak: 0.07 },
  { frequency: 1975.5, delay: 0.07, peak: 0.05 },
];
const DECAY_SECONDS = 0.35;

export function playHighlightChime() {
  if (!context || context.state !== "running") return;
  if (!useMessageSound.getState().isMessageSoundEnabled) return;

  const start = context.currentTime;
  for (const note of NOTES) {
    const at = start + note.delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(note.peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + DECAY_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + DECAY_SECONDS);
  }
}
