import { useEffect, useState } from "react";

export const PLAYER_WIDTH = 600;
export const PLAYER_HEIGHT = 400;
export const PLAYER_TOP_PADDING = 48;
export const PLAYER_BOTTOM_PADDING = 32;

type Position = { x: number; y: number };

const getViewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

const clampPosition = (pos: Position): Position => {
  const { width, height } = getViewport();

  return {
    x: Math.min(Math.max(0, pos.x), width - PLAYER_WIDTH),
    y: Math.min(
      Math.max(PLAYER_TOP_PADDING, pos.y),
      height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING,
    ),
  };
};

const getCorners = (): Position[] => {
  const { width, height } = getViewport();

  return [
    { x: 0, y: PLAYER_TOP_PADDING },
    { x: width - PLAYER_WIDTH, y: PLAYER_TOP_PADDING },
    { x: 0, y: height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING },
    {
      x: width - PLAYER_WIDTH,
      y: height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING,
    },
  ];
};

const getDefaultPosition = (): Position => ({
  x: Math.max(0, window.innerWidth - PLAYER_WIDTH),
  y: PLAYER_TOP_PADDING,
});

export function useDraggableVideo(isEnabled: boolean) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;
    setPosition(getDefaultPosition());
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !position) return;

    const handleResize = () => {
      const clamped = clampPosition(position);
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPosition(clamped);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position, isEnabled]);

  const onDragStart = () => setIsDragging(true);

  const onDrag = (x: number, y: number) => {
    setPosition(clampPosition({ x, y }));
  };

  const onDragStop = () => {
    if (!position) return;

    const corners = getCorners();

    const nearest = corners.reduce(
      (closest, corner) => {
        const dist = Math.hypot(position.x - corner.x, position.y - corner.y);
        return dist < closest.dist ? { corner, dist } : closest;
      },
      { corner: corners[0], dist: Infinity },
    ).corner;

    setPosition(nearest);
    setIsDragging(false);
  };

  return {
    position,
    isDragging,
    onDragStart,
    onDrag,
    onDragStop,
  };
}
