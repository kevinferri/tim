import { useState } from "react";
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
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useDateFormatter } from "@/lib/hooks";

type Props = {
  status: string | null;
  userId: string;
  lastStatusUpdate: Date | null;
  variant?: "minimal" | "tooltip";
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
  const [status, setStatus] = useState(props.status);
  const [lastStatusUpdate, setLastStatusUpdate] = useState(
    props.lastStatusUpdate
  );

  const statusUpdatedOn = useDateFormatter(lastStatusUpdate ?? undefined, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const variant = props.variant ?? "tooltip";
  const dot = (
    <span
      className={`border relative inline-flex rounded-full w-3 h-3 ${STATUS_COLOR}`}
    />
  );

  useSocketHandler<UserUpdatedStatusHandlerProps>(
    SocketEvent.UpdateUserStatus,
    (payload) => {
      if (payload.user.id === props.userId) {
        setStatus(payload.user.status ?? null);
        setLastStatusUpdate(payload.user.lastStatusUpdate ?? null);
      }
    }
  );

  if (!status) return null;

  if (props.variant === "minimal") {
    return (
      <>
        {dot} {status} @ {statusUpdatedOn}
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
        <TooltipContent side="right">
          <div className="flex flex-col">
            <div className="flex gap-1 items-center">
              <span className="flex gap-1 items-center text-sm">
                {dot} {status}
              </span>
              {self.id === props.userId && (
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
      </Tooltip>
    </TooltipProvider>
  );
}
