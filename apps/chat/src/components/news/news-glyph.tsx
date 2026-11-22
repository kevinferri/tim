export function NewsGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* 17×16 of the 24 grid, balanced against the Game room controller. */}
      <path d="M3.5 4h14v14a2 2 0 0 0 2 2h-14a2 2 0 0 1-2-2V4Z" />
      <path d="M17.5 8h3v10a2 2 0 0 1-2 2" />
      <path d="M7 8h7M7 11.75h7M7 15.5h4.5" />
    </svg>
  );
}
