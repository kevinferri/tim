"use client";

import type { ReactNode } from "react";
import { PlayerHeader, PlayerToggleButton } from "./video-player-header";
import { AttachmentFrame } from "./message-attachment";
import { DraggableVideoContainer } from "./draggable-video-container";
import { useDraggableVideo } from "./use-draggable-video";
import { VideoPlayerFrame } from "./video-player-frame";

type Props = {
  src: string;
  onPreviewLoad?: () => void;
  skipVirtualization?: boolean;
  onGlobalClick?: () => void;
  isGlobal?: boolean;
  isPlayingInGlobal?: boolean;
  caption?: ReactNode;
};

export function VideoPlayer({
  src,
  onPreviewLoad,
  onGlobalClick,
  skipVirtualization = false,
  isGlobal = false,
  isPlayingInGlobal = false,
  caption,
}: Props) {
  const draggableVideo = useDraggableVideo(isGlobal);

  const frame = (
    <VideoPlayerFrame
      src={src}
      onLoad={onPreviewLoad}
      skipVirtualization={skipVirtualization}
      isPlayingInGlobal={isPlayingInGlobal}
    />
  );

  if (isGlobal) {
    return (
      <DraggableVideoContainer
        position={draggableVideo.position}
        isDragging={draggableVideo.isDragging}
        onDragStart={draggableVideo.onDragStart}
        onDrag={(_, uiData) => draggableVideo.onDrag(uiData.x, uiData.y)}
        onDragStop={draggableVideo.onDragStop}
        onMeasureHeight={draggableVideo.onMeasureHeight}
      >
        <PlayerHeader onCloseClick={onGlobalClick} />
        {frame}
      </DraggableVideoContainer>
    );
  }

  return (
    <AttachmentFrame
      caption={caption}
      action={
        onGlobalClick && (
          <PlayerToggleButton
            onExpandClick={onGlobalClick}
            onCloseClick={onGlobalClick}
            isPlayingInGlobal={isPlayingInGlobal}
          />
        )
      }
    >
      {frame}
    </AttachmentFrame>
  );
}
