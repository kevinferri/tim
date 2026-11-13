"use client";

import { useCallback } from "react";
import { parseSamePageSubcommand } from "@tim/commands";
import { fetchSamePage } from "./api";
import { openSamePage } from "./view-store";

/**
 * Handles `/samepage <sub>` in the browser by opening the game.
 * Returns false for subcommands that should still be sent as a message (`sock`).
 */
export function useSamePageCommand(circleId: string) {
  return useCallback(
    (prompt: string) => {
      const sub = parseSamePageSubcommand(prompt);
      if (sub === "sock") return false;

      if (sub !== "default") {
        openSamePage(sub);
        return true;
      }

      // Default: play if still unanswered during the play window; otherwise results.
      void fetchSamePage<{ phase?: string; myAnswer?: unknown }>(circleId)
        .then((state) =>
          openSamePage(
            state.phase === "play" && !state.myAnswer ? "play" : "results",
          ),
        )
        .catch(() => openSamePage("play"));
      return true;
    },
    [circleId],
  );
}
