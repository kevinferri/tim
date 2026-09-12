// Intentionally not @radix-ui/react-scroll-area: verified live that its internal context refs never populate under React 19's single-pass render, so its thumb never draws even though native scrolling works -- a plain native div with a CSS-themed scrollbar can't hit that desync.

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    // overflow-x-hidden isn't just for clipping: paired with overflow-y-auto it gives this flex child a min-width of 0 per the flexbox spec, so it can't grow past its container to fit a wide descendant.
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
