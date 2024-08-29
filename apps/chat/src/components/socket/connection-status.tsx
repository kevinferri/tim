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

  const dot = useMemo(() => {
    if (typeof isConnected === "undefined") return null;

    return (
      <>
        {!isConnected && (
          <span
            className={`animate-ping absolute inline-flex rounded-full bg-red-600 opacity-80 ${dotSize}`}
          />
        )}
        <span
          className={`border relative inline-flex rounded-full ${dotSize} ${
            isConnected ? "bg-green-600" : "bg-red-600"
          }`}
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
            <div>{isConnected ? "Connected" : "Disconnected"}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
