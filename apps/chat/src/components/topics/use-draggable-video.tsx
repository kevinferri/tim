import { useEffect, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export const PLAYER_WIDTH = 480;
export const PLAYER_HEIGHT = 320;
export const PLAYER_TOP_PADDING = 48;
export const PLAYER_BOTTOM_PADDING = 44;

type Position = { x: number; y: number };
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type PersistedState = {
  corner: Corner;
};

type Viewport = {
  width: number;
  height: number;
};

const getViewport = (): Viewport => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

const getCornerPositions = ({
  width,
  height,
}: Viewport): Record<Corner, Position> => ({
  "top-left": { x: 0, y: PLAYER_TOP_PADDING },
  "top-right": { x: width - PLAYER_WIDTH, y: PLAYER_TOP_PADDING },
  "bottom-left": {
    x: 0,
    y: height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING,
  },
  "bottom-right": {
    x: width - PLAYER_WIDTH,
    y: height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING,
  },
});

const clampPosition = (
  pos: Position,
  { width, height }: Viewport,
): Position => ({
  x: Math.min(Math.max(0, pos.x), width - PLAYER_WIDTH),
  y: Math.min(
    Math.max(PLAYER_TOP_PADDING, pos.y),
    height - PLAYER_HEIGHT - PLAYER_BOTTOM_PADDING,
  ),
});

const getNearestCorner = (pos: Position, viewport: Viewport): Corner => {
  const corners = getCornerPositions(viewport);

  return (Object.entries(corners) as [Corner, Position][]).reduce(
    (closest, [corner, cornerPos]) => {
      const dist = Math.hypot(pos.x - cornerPos.x, pos.y - cornerPos.y);
      return dist < closest.dist ? { corner, dist } : closest;
    },
    { corner: "top-right" as Corner, dist: Infinity },
  ).corner;
};

export function useDraggableVideo(
  isEnabled: boolean,
  storageKey = "floating-video",
) {
  const [persisted, setPersisted] = useLocalStorage<PersistedState>(
    storageKey,
    { corner: "top-right" },
  );

  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;
    const viewport = getViewport();
    setPosition(getCornerPositions(viewport)[persisted.corner]);
  }, [isEnabled, persisted.corner]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleResize = () => {
      const viewport = getViewport();
      setPosition(getCornerPositions(viewport)[persisted.corner]);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isEnabled, persisted.corner]);

  const onDragStart = () => setIsDragging(true);

  const onDrag = (x: number, y: number) => {
    const viewport = getViewport();
    setPosition(clampPosition({ x, y }, viewport));
  };

  const onDragStop = () => {
    if (!position) return;

    const viewport = getViewport();
    const corner = getNearestCorner(position, viewport);

    setPersisted({ corner });
    setPosition(getCornerPositions(viewport)[corner]);
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
