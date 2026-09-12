type Props = {
  content: string;
};

// Matches the fixed format rollDice() in command-handler.ts produces ("🎲
// rolled a 10") -- falls back to plain text if that format ever drifts out
// of sync.
const ROLL_PATTERN = /^🎲 rolled (a|an) (\d+)$/;

export function RollResult(props: Props) {
  const match = props.content.match(ROLL_PATTERN);

  if (!match) {
    return (
      <div className="whitespace-pre-line break-word leading-normal">
        {props.content}
      </div>
    );
  }

  const [, article, result] = match;

  return (
    <div className="flex items-center gap-1.5 leading-normal">
      <span>rolled {article}</span>
      <span className="animate-in zoom-in-50 duration-300 text-amber-600 dark:text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.8)]">
        {result}
      </span>
    </div>
  );
}
