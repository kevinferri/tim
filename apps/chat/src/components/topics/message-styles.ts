export const baseStyles = [
  "z-0",
  // Always present so markerRingStyles can fade *out*: dropping the transition
  // together with the ring leaves nothing to animate.
  "transition-shadow",
  "p-3",
  "relative",
  "hover:bg-black/[0.03]",
  "dark:hover:bg-slate-900",
  "after:content-['']",
  "after:h-full",
  "after:absolute",
  "after:left-[0]",
  "after:top-[0]",
  "after:w-[0]",
  "after:-z-10",
];

// A thin accent on the left edge marks messages you've highlighted.
export const highlightStyles = [
  "after:w-[1.5px]",
  "after:bg-highlight-icon",
  "after:[transition:300ms]",
];

// Marks a row that needs picking out of the transcript -- the message whose
// thread sheet is open, and transiently the target of a jump. A ring rather
// than a fill: the sheet's scrim muddies a background wash but leaves a
// saturated edge legible. Inset, because these rows span the full width and an
// outset ring is clipped by the transcript's overflow-x-hidden; ring rather
// than border so it doesn't shift layout. The fade comes from baseStyles'
// transition-shadow, which has to stay applied when this is removed.
export const markerRingStyles = [
  "ring-2",
  "ring-inset",
  "ring-mention",
  "rounded-md",
];
