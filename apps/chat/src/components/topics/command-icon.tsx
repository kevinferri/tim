import { CommandName } from "@tim/commands";
import { cn } from "@/lib/utils";

type Props = {
  name: CommandName;
  className?: string;
};

// Used where there's no lucide equivalent and no brand to source a real
// logo from (Roll, EightBall) -- the emoji already reads unambiguously as
// the thing it represents, so it stands in as the icon directly.
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

// Giphy/YouTube marks are official artwork pulled from each brand's own
// asset kit (brand.youtube's "Core YouTube icon" download, and the
// attribution glyph cropped out of developers.giphy.com's "Giphy
// Attribution Marks" pack) rather than a generic icon set, so they render
// as real logo images -- not square, hence object-contain so neither gets
// squashed to fit the icon box.
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
