"use client";

import { useRef, useState, useCallback } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { cn } from "@/lib/utils";
import { PLAYER_WIDTH, PLAYER_TOP_PADDING } from "./use-draggable-video";

type Props = {
  children: React.ReactNode;
  isDragging: boolean;
  position: { x: number; y: number } | null;
  onDragStart: (event: DraggableEvent, uiData: DraggableData) => void;
  onDrag: (event: DraggableEvent, uiData: DraggableData) => void;
  onDragStop: () => void;
};

export function DraggableVideoContainer({
  children,
  isDragging,
  position,
  onDragStart,
  onDrag,
  onDragStop,
}: Props) {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });

  const handleDragStart = useCallback(
    (event: DraggableEvent, uiData: DraggableData) => {
      const { x, y } = uiData;
      const { clientWidth, clientHeight } = window.document.documentElement;
      const targetRect = draggableRef.current?.getBoundingClientRect();

      if (targetRect) {
        const { top, right, bottom, left } = targetRect;

        setBounds({
          left: -left + x,
          right: clientWidth - (right - x),
          top: -top + y,
          bottom: clientHeight - (bottom - y),
        });
      }

      onDragStart(event, uiData);
    },
    [onDragStart]
  );

  return (
    <>
      {isDragging && <div className="fixed inset-0 z-40 pointer-events-auto" />}
      <div
        className={cn("fixed inset-0 pointer-events-none z-50 cursor-grabbing")}
      >
        <Draggable
          nodeRef={draggableRef}
          cancel="button"
          bounds={bounds}
          position={position ?? undefined}
          onStart={handleDragStart}
          onDrag={onDrag}
          onStop={onDragStop}
          defaultPosition={{
            x: Math.max(0, window.innerWidth - PLAYER_WIDTH),
            y: PLAYER_TOP_PADDING,
          }}
        >
          <div
            ref={draggableRef}
            className="pointer-events-auto rounded-md overflow-hidden shadow-lg"
            style={{ width: `${PLAYER_WIDTH}px` }}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 bg-background/20" />
            )}
            {children}
          </div>
        </Draggable>
      </div>
    </>
  );
}
