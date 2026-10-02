import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDateFormatter } from "@/lib/hooks/use-date-formatter";
import { useNow } from "@/lib/hooks/use-now";
import { formatFeedTime, formatFullDateTime } from "@/lib/relative-time";
import { formatStatus, splitStatus } from "@/lib/status";

type Props = {
  status: string | null;
  userId: string;
  lastStatusUpdate: Date | null;
  variant?: "minimal" | "tooltip";
  isOnline?: boolean;
};

// Tooltips invert the theme (bg-primary), so secondary text fades the tooltip's own color rather than using muted-foreground.
function StatusSetAt(props: { lastStatusUpdate: Date | null }) {
  const now = useNow();
  if (!props.lastStatusUpdate || now === null) return null;

  const setAt = new Date(props.lastStatusUpdate);
  const ago = formatFeedTime(setAt, new Date(now));

  return (
    <span className="text-[11px] text-primary-foreground/70">
      Set{" "}
      <time dateTime={setAt.toISOString()} title={formatFullDateTime(setAt)}>
        {ago === "Yesterday" ? "yesterday" : ago}
      </time>
    </span>
  );
}

// The dot is presence only. Where presence isn't known (e.g. transcript avatars), a status shows as an emoji badge instead.
export function UserStatus(props: Props) {
  const statusUpdatedOn = useDateFormatter(
    props.lastStatusUpdate ?? undefined,
    {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const variant = props.variant ?? "tooltip";

  if (variant === "minimal") {
    if (!props.status) return null;
    return (
      <span>
        {formatStatus(props.status)}
        {statusUpdatedOn && ` · since ${statusUpdatedOn}`}
      </span>
    );
  }

  if (typeof props.isOnline === "undefined") {
    if (!props.status) return null;
    const { emoji } = splitStatus(props.status);

    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span className="absolute -right-1 -bottom-1 flex size-[18px] cursor-default items-center justify-center rounded-full border-[1.5px] border-background bg-secondary text-[10px] leading-none">
              {emoji}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium">
                {formatStatus(props.status)}
              </span>
              <StatusSetAt lastStatusUpdate={props.lastStatusUpdate} />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const dot = (
    <span
      className={`border relative inline-flex rounded-full w-3 h-3 ${
        props.isOnline ? "bg-success" : "bg-muted-foreground"
      }`}
    />
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="cursor-pointer absolute flex right-0 bottom-0">
            {dot}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col gap-1">
            <span className="flex gap-1.5 items-center">
              {dot} {props.isOnline ? "Online" : "Offline"}
            </span>
            {props.status && (
              <>
                <span className="text-[13px] font-medium">
                  {formatStatus(props.status)}
                </span>
                <StatusSetAt lastStatusUpdate={props.lastStatusUpdate} />
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
