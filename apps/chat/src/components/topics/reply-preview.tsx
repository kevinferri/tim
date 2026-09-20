import { Cross2Icon } from "@radix-ui/react-icons";
import { getDisplayName } from "@tim/user-display";
import { Button } from "@/components/ui/button";
import { ReplyIcon } from "@/components/icons/reply-icon";
import { cn } from "@/lib/utils";

type Props = {
  senderName: string | null;
  text: string;
  onCancel?: () => void;
  onClick?: () => void;
  className?: string;
  /** Single-line quote for dense surfaces (thread sidebar). */
  compact?: boolean;
};

// Compact quoted-reply reference, shared by the composer (while replying, with
// a cancel button) and a message bubble that's itself a reply (read-only).
export function ReplyPreview({
  senderName,
  text,
  onCancel,
  onClick,
  className,
  compact = false,
}: Props) {
  const name = getDisplayName(senderName);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
        compact
          ? "gap-1"
          : "items-start border-l-2 border-muted-foreground/25 pl-2",
        onClick && "cursor-pointer hover:text-foreground",
        className,
      )}
      onClick={onClick}
      title={text ? `${name}: ${text}` : name}
    >
      <ReplyIcon className={cn("shrink-0", !compact && "mt-0.5")} />
      {compact ? (
        <div className="flex min-w-0 flex-1 items-baseline gap-1">
          <span className="shrink-0 font-medium text-foreground/70">
            {name}
          </span>
          {text ? <span className="min-w-0 truncate">{text}</span> : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <span className="font-medium text-foreground/70">{name}</span>
          {text ? (
            <span className="break-words line-clamp-1 text-muted-foreground">
              {" "}
              {text}
            </span>
          ) : null}
        </div>
      )}
      {onCancel && (
        <Button
          size="iconSm"
          variant="ghost"
          className="ml-auto shrink-0"
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
