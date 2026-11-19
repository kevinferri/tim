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
      <path d="M4 5h13v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5Z" />
      <path d="M17 9h3v9a2 2 0 0 1-2 2" />
      <path d="M7.5 9h6M7.5 12.5h6M7.5 16h4" />
    </svg>
  );
}
