"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const spinnerVariants =
  "w-6 h-6 border-2 border-t-1 border-gray-200 border-t-gray-600 rounded-full animate-spin";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (props, ref) => {
    const { className, ...rest } = props;
    return (
      <div ref={ref} className={cn(spinnerVariants, className)} {...rest} />
    );
  }
);

Spinner.displayName = "LoadingSpinner";

export { Spinner };
