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
import { useState } from "react";
import { SocketEvent, useSocketHandler } from "../socket/use-socket";
import { useDateFormatter } from "@/lib/hooks";

type Props = {
  status?: string;
  userId: string;
  lastStatusUpdate?: Date;
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
  const statusUpdatedOn = useDateFormatter(lastStatusUpdate);
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
        setStatus(payload.user.status);
        setLastStatusUpdate(payload.user.lastStatusUpdate);
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
          <div className="cursor-pointer absolute flex right-0 bottom-[-1px]">
            {dot}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex flex-col">
            <div className="flex gap-1 items-center font-medium">
              <span className="flex gap-1 items-center">
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
            <div className="flex gap-1 items-center text-slate-300 dark:text-slate-500 text-[14px]">
              <span>@ </span>
              {statusUpdatedOn && (
                <time className="text-[10px] mt-0.5">{statusUpdatedOn}</time>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
