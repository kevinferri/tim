import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { useSelf } from "@/components/auth/self-provider";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";
import { useDateFormatter } from "@/lib/hooks";

type Props = {
  status: string | null;
  userId: string;
  lastStatusUpdate: Date | null;
  variant?: "minimal" | "tooltip";
  isOnline?: boolean;
};

export const STATUS_COLOR = "bg-yellow-500";

export type UserUpdatedStatusHandlerProps = {
  user: {
    name: string;
    status?: string;
    id: string;
    lastStatusUpdate?: Date;
  };
};

export function UserStatus(props: Props) {
  const self = useSelf();
  const { updateStatus } = useUpdateUserStatus();

  const getDotColor = () => {
    if (props.status) return STATUS_COLOR;
    if (Boolean(props.isOnline)) return "bg-green-600";
    return "bg-slate-400";
  };

  const statusUpdatedOn = useDateFormatter(
    props.lastStatusUpdate ?? undefined,
    {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const variant = props.variant ?? "tooltip";
  const dot = (
    <span
      className={`border relative inline-flex rounded-full w-3 h-3 ${getDotColor()}`}
    />
  );

  if (!props.status && typeof props.isOnline === "undefined") return null;

  if (variant === "minimal") {
    return (
      <>
        {dot} {getTooltipContent()} since {statusUpdatedOn}
      </>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="cursor-pointer absolute flex right-0 bottom-0">
            {dot}
          </div>
        </TooltipTrigger>
        {props.status && (
          <TooltipContent side="right">
            <div className="flex flex-col">
              <div className="flex gap-1 items-center">
                <span className="flex gap-1 items-center text-sm">
                  {dot} {props.status}
                </span>
                {self.id === props.userId && props.status && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={(e) => {
                      e.preventDefault();
                      updateStatus(null);
                    }}
                  >
                    <CrossCircledIcon />
                  </Button>
                )}
              </div>
              <div className="flex ml-4 text-slate-300 dark:text-slate-500">
                {statusUpdatedOn && (
                  <span className="text-[10px]">
                    since <time>{statusUpdatedOn}</time>
                  </span>
                )}
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
