import { useCallback, useEffect, useState } from "react";

export const PLAYER_WIDTH = 480;
// Fallback used only until the container reports its real rendered height
// (see onMeasureHeight below) -- header height can drift from this, so it's
// a starting guess, not the value corner/bounds math actually relies on.
export const PLAYER_HEIGHT_FALLBACK = 320;
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

const DEFAULT_PERSISTED: PersistedState = { corner: "top-right" };

function readPersistedCorner(storageKey: string): PersistedState {
  if (typeof window === "undefined") return DEFAULT_PERSISTED;

  try {
    const item = window.localStorage.getItem(storageKey);
    if (item) return JSON.parse(item);
  } catch (e) {}

  return DEFAULT_PERSISTED;
}

const getViewport = (): Viewport => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

const getCornerPositions = (
  { width, height }: Viewport,
  playerHeight: number
): Record<Corner, Position> => ({
  "top-left": { x: 0, y: PLAYER_TOP_PADDING },
  "top-right": { x: width - PLAYER_WIDTH, y: PLAYER_TOP_PADDING },
  "bottom-left": {
    x: 0,
    y: height - playerHeight - PLAYER_BOTTOM_PADDING,
  },
  "bottom-right": {
    x: width - PLAYER_WIDTH,
    y: height - playerHeight - PLAYER_BOTTOM_PADDING,
  },
});

const clampPosition = (
  pos: Position,
  { width, height }: Viewport,
  playerHeight: number
): Position => ({
  x: Math.min(Math.max(0, pos.x), width - PLAYER_WIDTH),
  y: Math.min(
    Math.max(PLAYER_TOP_PADDING, pos.y),
    height - playerHeight - PLAYER_BOTTOM_PADDING
  ),
});

const getNearestCorner = (
  pos: Position,
  viewport: Viewport,
  playerHeight: number
): Corner => {
  const corners = getCornerPositions(viewport, playerHeight);

  return (Object.entries(corners) as [Corner, Position][]).reduce(
    (closest, [corner, cornerPos]) => {
      const dist = Math.hypot(pos.x - cornerPos.x, pos.y - cornerPos.y);
      return dist < closest.dist ? { corner, dist } : closest;
    },
    { corner: "top-right" as Corner, dist: Infinity }
  ).corner;
};

export function useDraggableVideo(
  isEnabled: boolean,
  storageKey = "floating-video"
) {
  // Read synchronously (not via an effect) so the very first paint already
  // reflects the corner the user last docked at -- an effect-based load
  // would render at the fallback top-right corner for one frame first,
  // producing a visible flash-then-jump every time the player reopens.
  const [persisted, setPersistedState] = useState<PersistedState>(() =>
    readPersistedCorner(storageKey)
  );

  const [playerHeight, setPlayerHeight] = useState(PLAYER_HEIGHT_FALLBACK);

  const [position, setPosition] = useState<Position | null>(() => {
    if (!isEnabled || typeof window === "undefined") return null;
    return getCornerPositions(getViewport(), PLAYER_HEIGHT_FALLBACK)[
      readPersistedCorner(storageKey).corner
    ];
  });

  const [isDragging, setIsDragging] = useState(false);

  const setPersisted = useCallback(
    (next: PersistedState) => {
      setPersistedState(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {}
    },
    [storageKey]
  );

  // Once the container measures its real rendered height, re-settle onto
  // the persisted corner using that height instead of the fallback guess.
  const onMeasureHeight = useCallback(
    (height: number) => {
      setPlayerHeight((prev) => {
        if (Math.abs(prev - height) < 1) return prev;
        return height;
      });
    },
    []
  );

  useEffect(() => {
    if (!isEnabled) return;

    const viewport = getViewport();
    setPosition(getCornerPositions(viewport, playerHeight)[persisted.corner]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, persisted.corner, playerHeight]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleResize = () => {
      const viewport = getViewport();
      setPosition(
        getCornerPositions(viewport, playerHeight)[persisted.corner]
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isEnabled, persisted.corner, playerHeight]);

  const onDragStart = () => setIsDragging(true);

  const onDrag = (x: number, y: number) => {
    const viewport = getViewport();
    setPosition(clampPosition({ x, y }, viewport, playerHeight));
  };

  const onDragStop = () => {
    if (!position) return;

    const viewport = getViewport();
    const corner = getNearestCorner(position, viewport, playerHeight);

    setPersisted({ corner });
    setPosition(getCornerPositions(viewport, playerHeight)[corner]);
    setIsDragging(false);
  };

  return {
    position,
    isDragging,
    onDragStart,
    onDrag,
    onDragStop,
    onMeasureHeight,
  };
}
