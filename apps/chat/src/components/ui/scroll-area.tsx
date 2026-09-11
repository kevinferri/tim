// This intentionally does NOT use @radix-ui/react-scroll-area. Its custom
// scrollbar/thumb depends on internal context refs (context.scrollArea for
// type="hover", context.viewport for type="scroll") wired through
// useComposedRefs -- verified live against production that these refs never
// get populated under React 19 on a single-pass render, so the thumb never
// renders regardless of `type` even though native scrolling underneath
// works fine. A plain native scrollable div with a CSS-themed scrollbar
// (see .themed-scrollbar in globals.css) can't suffer that desync: the
// browser draws the thumb itself from the real scroll position.

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    // overflow-x-hidden matters beyond clipping horizontal overflow: pairing
    // it with overflow-y-auto gives this element an automatic min-width of 0
    // per the flexbox spec, so as a flex child it can't grow past its
    // container to fit a wide descendant. Radix's Viewport had this
    // implicitly (it set both axes' overflow); a bare overflow-y-auto here
    // does not, and the layout visibly breaks without it.
    className={cn(
      "relative overflow-x-hidden overflow-y-auto themed-scrollbar",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
