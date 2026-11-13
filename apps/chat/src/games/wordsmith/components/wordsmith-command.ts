import { fetchWordsmith } from "./api";
import { openWordsmith, type WordsmithView } from "./view-store";

const SUBCOMMANDS: WordsmithView[] = ["play", "results", "stats"];

/** `/wordsmith [play|results|stats]`; with no subcommand, play until you've finished, then results. */
export function runWordsmithCommand(prompt: string, circleId: string) {
  const token = prompt.trim().split(/\s+/)[0]?.toLowerCase();
  const sub = SUBCOMMANDS.find((v) => v === token);
  if (sub) {
    openWordsmith(sub);
    return true;
  }

  void fetchWordsmith(circleId)
    .then((state) =>
      openWordsmith(
        state.enabled && state.myPlay.finished ? "results" : "play",
      ),
    )
    .catch(() => openWordsmith("play"));
  return true;
}
