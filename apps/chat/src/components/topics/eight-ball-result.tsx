type Props = {
  content: string;
};

// Matches the fixed format eightBall() in command-handler.ts produces --
// "🎱 It is certain." -- so the emoji can be dropped (the message already
// gets a 🎱 icon via CommandIcon) without hand-parsing the whole string.
const EIGHT_BALL_PATTERN = /^🎱 (.+)$/;

export function EightBallResult(props: Props) {
  const match = props.content.match(EIGHT_BALL_PATTERN);
  const answer = match ? match[1] : props.content;

  return (
    <div className="whitespace-pre-line break-word leading-normal">
      {answer}
    </div>
  );
}
