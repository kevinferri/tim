"use client";

import { Button } from "@/components/ui/button";
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

type ToggleProps = Pick<Props, "isPlayingInGlobal"> & {
  onExpandClick?: () => void;
  onCloseClick?: () => void;
};

// Pops an inline video out to picture-in-picture, or brings it back.
export function PlayerToggleButton({
  onExpandClick,
  onCloseClick,
  isPlayingInGlobal = false,
}: ToggleProps) {
  const Icon = isPlayingInGlobal ? ArrowBottomLeftIcon : ArrowTopRightIcon;

  return (
    <Button
      variant="ghost"
      size="iconXs"
      aria-label={
        isPlayingInGlobal ? "Return to message" : "Play in picture-in-picture"
      }
      onClick={isPlayingInGlobal ? onCloseClick : onExpandClick}
      className="hover:opacity-80"
    >
      <Icon />
    </Button>
  );
}

// The picture-in-picture player's drag handle.
export function PlayerHeader({ onCloseClick }: Pick<Props, "onCloseClick">) {
  return (
    <div className="flex cursor-grab items-center justify-end bg-secondary p-2">
      <Button
        variant="ghost"
        size="iconXs"
        aria-label="Close"
        onClick={onCloseClick}
        className="hover:opacity-80"
      >
        <Cross1Icon />
      </Button>
    </div>
  );
}
