import { CornerTopLeftIcon, Cross2Icon } from "@radix-ui/react-icons";
import { getDisplayName } from "@tim/user-display";
import { truncateText } from "@/components/topics/message-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  senderName: string | null;
  text: string;
  onCancel?: () => void;
  onClick?: () => void;
  className?: string;
};

// Compact quoted-reply reference, shared by the composer (while replying, with
// a cancel button) and a message bubble that's itself a reply (read-only).
export function ReplyPreview({
  senderName,
  text,
  onCancel,
  onClick,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 min-w-0 pl-2 border-l-2 border-muted-foreground/30 text-xs text-muted-foreground",
        onClick && "cursor-pointer hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <CornerTopLeftIcon className="shrink-0" />
      <span className="font-medium shrink-0">{getDisplayName(senderName)}</span>
      <span className="truncate">{truncateText(text, 12)}</span>
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
