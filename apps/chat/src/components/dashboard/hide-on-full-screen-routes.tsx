"use client";

import { usePathname } from "next/navigation";

// Full-screen pages (the casino tables) render without the app chrome.
const FULL_SCREEN = /^\/circles\/[^/]+\/casino(\/|$)/;

export function HideOnFullScreenRoutes({
  children,
}: {
  children: React.ReactNode;
}) {
  return FULL_SCREEN.test(usePathname()) ? null : children;
}
