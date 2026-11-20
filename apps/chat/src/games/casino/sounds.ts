import { audioContext, whenReady } from "@/lib/sounds";

// Kenney's CC0 Casino Audio (public/assets/sounds/casino): a few takes of each, so repeats sound natural.
const SOUNDS = {
  cardSlide: ["card-slide-1", "card-slide-2", "card-slide-3", "card-slide-4"],
  chipsStack: ["chips-stack-1", "chips-stack-2", "chips-stack-3"],
  chipsCollide: ["chips-collide-1", "chips-collide-2", "chips-collide-3"],
  chipsHandle: ["chips-handle-1", "chips-handle-3", "chips-handle-4"],
};
type Sound = keyof typeof SOUNDS;

// Per sound: a base pitch (cards and chips sit deeper than recorded, which read as thin and light), how far
// each play may wander from it (cards barely, so a deal sounds even), and any low-end boost, for body.
const TUNING: Record<Sound, { rate: number; wander: number; bassDb?: number }> =
  {
    cardSlide: { rate: 0.9, wander: 0.015, bassDb: 4 },
    chipsStack: { rate: 0.82, wander: 0.035, bassDb: 2 },
    chipsCollide: { rate: 0.82, wander: 0.035, bassDb: 2 },
    chipsHandle: { rate: 0.8, wander: 0.035, bassDb: 4 },
  };

// Everything the table plays goes through one volume, set well under the recordings' full level so the
// table sits with the app's chat sounds; raise or lower it here to change every table sound at once.
const TABLE_VOLUME = 0.5;
let bus: { ctx: AudioContext; node: GainNode } | null = null;
function master(ctx: AudioContext) {
  if (bus?.ctx !== ctx) {
    const node = ctx.createGain();
    node.gain.value = TABLE_VOLUME;
    node.connect(ctx.destination);
    bus = { ctx, node };
  }
  return bus.node;
}

const buffers = new Map<string, AudioBuffer>();
let loading: Promise<void> | null = null;

/** Fetches and decodes every table sound once, so the first deal isn't silent. */
export function preloadTableSounds() {
  const ctx = audioContext();
  if (!ctx || loading) return;
  loading = Promise.all(
    Object.values(SOUNDS)
      .flat()
      .map(async (name) => {
        const res = await fetch(`/assets/sounds/casino/${name}.mp3`);
        buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
      }),
  ).then(
    () => undefined,
    // A missing sound just stays silent.
    () => undefined,
  );
}

/**
 * Plays a random take of a table sound at its tuned pitch, wandering a little each time so it never
 * repeats exactly. `rate` raises or lowers the pitch on purpose (e.g. chips climbing a stack); silent
 * when sound is off.
 */
export function playTableSound(
  sound: Sound,
  { volume = 0.5, rate = 1, delayMs = 0 } = {},
) {
  whenReady((ctx) => {
    const takes = SOUNDS[sound];
    const buffer = buffers.get(takes[Math.floor(Math.random() * takes.length)]);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const { rate: base, wander } = TUNING[sound];
    source.playbackRate.value =
      base * rate * (1 - wander + Math.random() * 2 * wander);
    const gain = ctx.createGain();
    gain.gain.value = volume;
    let out: AudioNode = source;
    const { bassDb } = TUNING[sound];
    if (bassDb) {
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 300;
      bass.gain.value = bassDb;
      out = out.connect(bass);
    }
    out.connect(gain).connect(master(ctx));
    const at = ctx.currentTime + delayMs / 1000;
    source.start(at);
  });
}

/**
 * One step of a payout tally counting up (`step` of `steps`, from 0): a short wooden tick with a soft pluck
 * on top, each a semitone above the last, climbing to the same landing every time. The last step is that
 * landing: the climb carried on into a ringing major chord, with the chips clattering in. Synthesized.
 */
export function playTallyKnock(step: number, steps: number) {
  if (step >= steps - 1) {
    playTallyLanding();
    return;
  }
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const frequency = tallyPitch(step, steps);
    tallyPluck(ctx, master(ctx), frequency, at, 0.07, 0.12);

    // The tick: a triangle dropping fast in pitch, with a few milliseconds of filtered noise for the wood.
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(frequency, at);
    tone.frequency.exponentialRampToValueAtTime(frequency * 0.6, at + 0.05);
    toneGain.gain.setValueAtTime(0.1, at);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    tone.connect(toneGain).connect(master(ctx));
    tone.start(at);
    tone.stop(at + 0.05);
    const samples = Math.floor(ctx.sampleRate * 0.012);
    const noise = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < samples; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
    const click = ctx.createBufferSource();
    click.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = frequency * 2.5;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.08;
    click.connect(band).connect(clickGain).connect(master(ctx));
    click.start(at);
  });
}

// Every win lands on the same chord, rooted here; a bigger win climbs to it from further down, a
// semitone a step (`steps` in all), so its size shows in the build-up rather than in a higher ending.
const TALLY_LANDING_HZ = 600 * 2 ** (21 / 12);
const tallyPitch = (step: number, steps: number) =>
  TALLY_LANDING_HZ * 2 ** ((step - steps) / 12);

/** The tally's plucked tone: a sine with a quick attack, ringing for `ring` seconds. */
function tallyPluck(
  ctx: AudioContext,
  out: AudioNode,
  frequency: number,
  at: number,
  level: number,
  ring: number,
) {
  const pluck = ctx.createOscillator();
  const gain = ctx.createGain();
  pluck.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
  pluck.connect(gain).connect(out);
  pluck.start(at);
  pluck.stop(at + ring);
}

/**
 * The tally's landing, the climb's continuation: the same plucked tone runs on up from the last step into
 * a major chord (the next note, its third, fifth and octave), each note ringing out into the room, with a
 * soft thump for weight, a little shimmer on top, and the chips clattering in.
 */
function playTallyLanding() {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const out = roomBus(ctx, 0.45);
    const root = TALLY_LANDING_HZ;
    [1, 1.26, 1.5, 2].forEach((ratio, i) => {
      const when = at + i * 0.045;
      tallyPluck(ctx, out, root * ratio, when, 0.055, 1.2 - i * 0.1);
      // A faint overtone, so the chord rings like a struck bell rather than a beep.
      tallyPluck(ctx, out, root * ratio * 2, when, 0.012, 0.5);
    });
    whoomp(ctx, at, 110, 55, 0.14);
    tone(ctx, out, root * 4, at + 0.18, 0.008, 0.9);
  });
  playTableSound("chipsCollide", { volume: 0.5 });
}

// A short, soft room: a decaying burst of noise as an impulse response, built once per context.
let room: { ctx: AudioContext; impulse: AudioBuffer } | null = null;
function roomImpulse(ctx: AudioContext) {
  if (room?.ctx === ctx) return room.impulse;
  const length = Math.floor(ctx.sampleRate * 1.4);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  room = { ctx, impulse };
  return impulse;
}

/**
 * A 21, in the win tally's voice: the landing alone, no count-up. The spy-film chord (E minor, major 7th
 * and 9th) rolled up in the tally's plucked tone, each note ringing like a struck bell into the room over a
 * soft thump. A natural blackjack adds a low E and a high E, rings longer, and sparkles down from the top.
 */
export function playTwentyOne(blackjack: boolean) {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const out = roomBus(ctx, 0.5);
    const E4 = 329.63;

    // Right away, as the gold 21 slams in: the spy chord, rolled up, ringing.
    const hit = at;
    const ring = blackjack ? 2.4 : 1.6;
    const chord = [329.63, 392, 493.88, 622.25, 739.99]; // E4 G4 B4 D#5 F#5
    const notes = blackjack ? [164.81, ...chord, 1318.51] : chord;
    notes.forEach((frequency, i) => {
      const when = hit + i * 0.04;
      tallyPluck(ctx, out, frequency, when, 0.05, ring - i * 0.08);
      tallyPluck(ctx, out, frequency * 2, when, 0.011, ring * 0.35);
    });
    whoomp(ctx, hit, 110, 50, blackjack ? 0.2 : 0.14);
    tone(ctx, out, E4 * 8, hit + 0.18, 0.008, 1);

    // A blackjack's sparkles: plucks falling from the top of the chord.
    if (blackjack)
      [2959.96, 2489.02, 1975.53, 1479.98].forEach((frequency, i) =>
        tallyPluck(ctx, out, frequency, hit + 0.3 + i * 0.09, 0.014, 0.7),
      );
  });
}

/** A plain sine note with a quick attack and an exponential fade. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  frequency: number,
  at: number,
  level: number,
  ring: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + ring);
}

/** A deep sine dropping in pitch, landing weight under a chord. */
function whoomp(
  ctx: AudioContext,
  at: number,
  from = 90,
  to = 42,
  level = 0.3,
) {
  const sub = ctx.createOscillator();
  const gain = ctx.createGain();
  sub.frequency.setValueAtTime(from, at);
  sub.frequency.exponentialRampToValueAtTime(to, at + 0.35);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
  sub.connect(gain).connect(master(ctx));
  sub.start(at);
  sub.stop(at + 0.4);
}

/** Sound sent here plays dry and into the soft room at `wet` level. */
function roomBus(ctx: AudioContext, wet: number) {
  const dry = ctx.createGain();
  dry.connect(master(ctx));
  const reverb = ctx.createConvolver();
  reverb.buffer = roomImpulse(ctx);
  const send = ctx.createGain();
  send.gain.value = wet;
  dry.connect(reverb).connect(send).connect(master(ctx));
  return dry;
}

/** One electric-piano note: simple FM, a sine whose brightness fades as it decays, like a Rhodes tine. */
function electricPiano(
  ctx: AudioContext,
  out: AudioNode,
  frequency: number,
  at: number,
  { level, ring }: { level: number; ring: number },
) {
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const depth = ctx.createGain();
  const gain = ctx.createGain();
  carrier.frequency.value = frequency;
  modulator.frequency.value = frequency;
  // The tine's bark at the start, mellowing quickly.
  depth.gain.setValueAtTime(frequency * 1.6, at);
  depth.gain.exponentialRampToValueAtTime(frequency * 0.1, at + 0.6);
  modulator.connect(depth).connect(carrier.frequency);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + ring);
  carrier.connect(gain).connect(out);
  for (const osc of [carrier, modulator]) {
    osc.start(at);
    osc.stop(at + ring);
  }
}

/** A soft felt thud: a hand or card meeting the table. */
function feltThud(
  ctx: AudioContext,
  at: number,
  from: number,
  to: number,
  level: number,
) {
  const thud = ctx.createOscillator();
  const gain = ctx.createGain();
  thud.frequency.setValueAtTime(from, at);
  thud.frequency.exponentialRampToValueAtTime(to, at + 0.12);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  thud.connect(gain).connect(master(ctx));
  thud.start(at);
  thud.stop(at + 0.14);
}

/** A stand: a soft felt tap with one quiet low piano note, settled (`loud` for your own). */
export function playStandSound(loud = false) {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const level = loud ? 1 : 0.6;
    feltThud(ctx, at, 190, 110, 0.28 * level);
    electricPiano(ctx, roomBus(ctx, 0.25), 246.94, at + 0.01, {
      level: 0.035 * level,
      ring: 0.6,
    });
  });
}

/** A bust: a duller thud with two low piano notes a half step apart, a small sour "aw" (`loud` for your own). */
export function playBustSound(loud = false) {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const level = loud ? 1 : 0.6;
    feltThud(ctx, at, 140, 70, 0.3 * level);
    const out = roomBus(ctx, 0.25);
    // E3 and F3 together.
    for (const frequency of [164.81, 174.61])
      electricPiano(ctx, out, frequency, at + 0.015, {
        level: 0.035 * level,
        ring: 0.8,
      });
  });
}

/** A double: the second stack going down beside the first, a heavy chip stack (louder for your own). */
export function playDoubleSound(mine: boolean) {
  playTableSound("chipsStack", { volume: mine ? 0.65 : 0.3 });
}

/** A player sitting down: two soft low plucks rising a fifth, in the win tally's voice (`mine` louder). */
export function playJoinSound(mine: boolean) {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const out = roomBus(ctx, 0.5);
    const level = mine ? 1 : 0.6;
    const root = TALLY_LANDING_HZ / 4;
    [root, root * 1.5].forEach((frequency, i) => {
      tallyPluck(ctx, out, frequency, at + i * 0.09, 0.035 * level, 0.9);
      tallyPluck(ctx, out, frequency * 2, at + i * 0.09, 0.005 * level, 0.35);
    });
  });
}

/** Your turn: one low pluck in the win tally's voice, ringing softly into the room; a nudge, not an alarm. */
export function playYourTurn() {
  whenReady((ctx) => {
    const at = ctx.currentTime;
    const out = roomBus(ctx, 0.55);
    const frequency = TALLY_LANDING_HZ / 4;
    tallyPluck(ctx, out, frequency, at, 0.04, 1);
    tallyPluck(ctx, out, frequency * 2, at, 0.006, 0.4);
  });
}
