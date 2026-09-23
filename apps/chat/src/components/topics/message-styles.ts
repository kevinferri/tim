export const baseStyles = [
  "z-0",
  // Always present so markerRingStyles can fade *out*: dropping the transition
  // together with the ring leaves nothing to animate.
  "transition-shadow",
  "p-3",
  "relative",
  "hover:bg-slate-50",
  "dark:hover:bg-slate-900",
  "after:content-['']",
  "after:h-full",
  "after:absolute",
  "after:left-[0]",
  "after:top-[0]",
  "after:w-[0]",
  "after:-z-10",
];

export const highlightStyles = [
  "after:-z-10",
  "after:w-full",
  "after:bg-highlight",
  "after:[transition:500ms]",
  "dark:after:bg-purple-950",
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
