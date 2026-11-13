import { fetchSpellItOut } from "./api";
import { openSpellItOut, type SpellItOutView } from "./view-store";

const SUBCOMMANDS: SpellItOutView[] = ["play", "results", "stats"];

/** `/spellitout [play|results|stats]`; with no subcommand, play until you've finished, then results. */
export function runSpellItOutCommand(prompt: string, circleId: string) {
  const token = prompt.trim().split(/\s+/)[0]?.toLowerCase();
  const sub = SUBCOMMANDS.find((v) => v === token);
  if (sub) {
    openSpellItOut(sub);
    return true;
  }

  void fetchSpellItOut(circleId)
    .then((state) =>
      openSpellItOut(
        state.enabled && state.myPlay.finished ? "results" : "play",
      ),
    )
    .catch(() => openSpellItOut("play"));
  return true;
}
