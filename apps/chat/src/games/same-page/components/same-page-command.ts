import { parseSamePageSubcommand } from "@tim/commands";
import { fetchSamePage } from "./api";
import { openSamePage } from "./view-store";

/** `/samepage <sub>` opens the game; `sock` returns false so it's still sent as a message. */
export function runSamePageCommand(prompt: string, circleId: string) {
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
}
