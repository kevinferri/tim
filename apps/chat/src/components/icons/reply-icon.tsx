import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// Radix has no reply glyph (its ResetIcon is the undo loop), so this fills the
// gap in Radix's idiom rather than introducing a second one: 15x15 viewBox,
// single filled path, ~1u stroke. Open 45-degree chevron with flat caps, a bar
// into a 135-degree curl (r=4.37, centre 9.13/9.53) ending on a diagonal cut,
// scaled to fill the box so it matches ChatBubbleIcon et al in optical size.
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
        d="M4.788 2.345L1.5 5.633L4.788 8.921L5.436 8.273L3.242 6.079H9.132C11.039 6.079 12.584 7.624 12.584 9.531C12.584 10.447 12.22 11.325 11.573 11.972L12.22 12.619C13.039 11.8 13.5 10.689 13.5 9.531C13.5 7.119 11.544 5.163 9.132 5.163H3.266L5.436 2.993Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
