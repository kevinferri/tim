import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { getDisplayName } from "@tim/user-display";
import { CommandName, parseCommand } from "@tim/commands";
import { Button } from "@/components/ui/button";
import { ReplyIcon } from "@/components/icons/reply-icon";
import { cn } from "@/lib/utils";

type Props = {
  senderName: string | null;
  text: string;
  mediaUrl?: string | null;
  onCancel?: () => void;
  onClick?: () => void;
  className?: string;
};

// `mediaUrl` is overloaded: for /tim, /roll and /8ball it carries the generated
// result rather than a URL (see the branching in message.tsx), so there's
// nothing to show a thumbnail for.
function getThumbnail(text: string, mediaUrl?: string | null) {
  const command = parseCommand(text ?? "")?.name;

  if (
    command === CommandName.Tim ||
    command === CommandName.Roll ||
    command === CommandName.EightBall
  ) {
    return undefined;
  }

  return mediaUrl || undefined;
}

// Compact quoted-reply reference, shared by the composer (while replying, with
// a cancel button) and a message bubble that's itself a reply (read-only).
export function ReplyPreview({
  senderName,
  text,
  mediaUrl,
  onCancel,
  onClick,
  className,
}: Props) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const name = getDisplayName(senderName);
  const thumbnail = getThumbnail(text, mediaUrl);
  const showThumbnail = !!thumbnail && !thumbnailFailed;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-1.5 border-l-2 border-muted-foreground/25 pl-2 text-xs text-muted-foreground",
        onClick && "group cursor-pointer hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <ReplyIcon className="mt-0.5 shrink-0" />

      {showThumbnail && (
        <img
          src={thumbnail}
          alt=""
          aria-hidden
          // Falls back to just the arrow for anything that isn't an image.
          onError={() => setThumbnailFailed(true)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-sm object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground/70 group-hover:text-foreground">
          {name}
        </span>
        {text ? (
          <span className="line-clamp-1 break-words text-muted-foreground group-hover:text-foreground">
            {" "}
            {text}
          </span>
        ) : null}
      </div>

      {onCancel && (
        <Button
          size="iconSm"
          variant="ghost"
          // Pin the colour: ghost's hover:text-accent-foreground would jump it
          // to near-white. It dismisses this preview, so it stays muted with
          // the rest of it rather than matching the composer's own controls.
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
        >
          <Cross2Icon />
        </Button>
      )}
    </div>
  );
}
