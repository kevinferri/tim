"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

// Casino tables are always dark, whatever the user's theme; their own setting is kept for everywhere else.
const isCasino = (pathname: string | null) =>
  !!pathname && /^\/circles\/[^/]+\/casino(\/|$)/.test(pathname);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  return (
    <NextThemesProvider
      {...props}
      forcedTheme={isCasino(pathname) ? "dark" : props.forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
