import { useMemo } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const dotSize = "w-3 h-3";

export function ConnectionStatus() {
  const {
    socketState: { isConnected },
  } = useSocketContext();

  const copy = isConnected ? "Connected" : "Disconnected";

  const dot = useMemo(() => {
    if (typeof isConnected === "undefined") return null;

    return (
      <>
        {!isConnected && (
          <span
            className={`animate-ping absolute inline-flex rounded-full bg-destructive opacity-80 ${dotSize}`}
          />
        )}
        <span
          className={`border relative inline-flex rounded-full ${dotSize} ${isConnected ? "bg-success" : "bg-destructive"}`}
        />
      </>
    );
  }, [isConnected]);

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
            <div>{copy}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
