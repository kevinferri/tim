import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Curved left-pointing reply arrow (matches product glyph; stroke uses
// currentColor so light/dark themes inherit from the surrounding control).
export function ReplyIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6.5 3.5L3 7L6.5 10.5M3.5 7H10C11.933 7 13.5 8.567 13.5 10.5V12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
