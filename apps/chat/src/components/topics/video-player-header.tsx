"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowTopRightIcon,
  ArrowBottomLeftIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";

type Props = {
  isGlobal?: boolean;
  onExpandClick?: () => void;
  onCloseClick?: () => void;
  isPlayingInGlobal?: boolean;
};

export function PlayerHeader({
  isGlobal = false,
  onExpandClick,
  onCloseClick,
  isPlayingInGlobal = false,
}: Props) {
  const action = isGlobal
    ? { icon: Cross1Icon, onClick: onCloseClick }
    : isPlayingInGlobal
    ? { icon: ArrowBottomLeftIcon, onClick: onCloseClick }
    : { icon: ArrowTopRightIcon, onClick: onExpandClick };

  const { icon: Icon, onClick } = action;

  return (
    <div
      className={cn(
        "flex items-center justify-end bg-secondary p-2",
        isGlobal && "cursor-grab",
      )}
    >
      <Button
        variant="ghost"
        size="iconXs"
        onClick={onClick}
        className="hover:opacity-80"
      >
        <Icon />
      </Button>
    </div>
  );
}
