import { CommandName } from "@tim/commands";
import { cn } from "@/lib/utils";

type Props = {
  name: CommandName;
  className?: string;
};

// Used where there's no lucide equivalent and no brand logo to source (Roll, EightBall) -- the emoji already reads unambiguously as the icon.
function EmojiIcon({
  emoji,
  className,
}: {
  emoji: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-base leading-none",
        className
      )}
    >
      {emoji}
    </span>
  );
}

// Official brand artwork (YouTube's icon kit, Giphy's attribution pack)
// rather than a generic icon set -- not square, hence object-contain so
// neither gets squashed.
export function CommandIcon({ name, className }: Props) {
  switch (name) {
    case CommandName.Giphy:
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/giphy-logo.png"
          alt=""
          className={cn("shrink-0 object-contain", className)}
        />
      );
    case CommandName.Youtube:
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/youtube-logo.png"
          alt=""
          className={cn("shrink-0 object-contain", className)}
        />
      );
    case CommandName.Roll:
      return <EmojiIcon emoji="🎲" className={className} />;
    case CommandName.EightBall:
      return <EmojiIcon emoji="🎱" className={className} />;
    case CommandName.Tim:
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/logo.svg"
          alt=""
          className={cn("shrink-0 rounded-full", className)}
        />
      );
  }
}
