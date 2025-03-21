import { useMemo } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelf } from "@/components/auth/self-provider";
import { STATUS_COLOR } from "@/components/ui/user-avatar";

const dotSize = "w-3 h-3";

export function ConnectionStatus() {
  const self = useSelf();
  const {
    socketState: { isConnected },
  } = useSocketContext();

  const getCopy = () => {
    if (Boolean(self.status)) return self.status;
    if (!isConnected) return "Disconnected";
    return "Connected";
  };

  const dot = useMemo(() => {
    if (typeof isConnected === "undefined") return null;

    const getColor = () => {
      if (Boolean(self.status)) return STATUS_COLOR;
      if (!isConnected) return "bg-red-600";
      return "bg-green-600";
    };

    return (
      <>
        {!isConnected && (
          <span
            className={`animate-ping absolute inline-flex rounded-full bg-red-600 opacity-80 ${dotSize}`}
          />
        )}
        <span
          className={`border relative inline-flex rounded-full ${dotSize} ${getColor()}`}
        />
      </>
    );
  }, [isConnected, self.status]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="cursor-pointer absolute flex right-0 bottom-1.5">
            {dot}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex gap-1.5 items-center">
            {dot}
            <div>{getCopy()}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
