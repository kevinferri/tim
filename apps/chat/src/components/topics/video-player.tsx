"use client";

import { PlayerHeader } from "./video-player-header";
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
};

export function VideoPlayer({
  src,
  onPreviewLoad,
  onGlobalClick,
  skipVirtualization = false,
  isGlobal = false,
  isPlayingInGlobal = false,
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

  const header = isGlobal ? (
    <PlayerHeader isGlobal onCloseClick={onGlobalClick} />
  ) : (
    onGlobalClick && (
      <PlayerHeader
        onExpandClick={onGlobalClick}
        onCloseClick={onGlobalClick}
        isGlobal={false}
        isPlayingInGlobal={isPlayingInGlobal}
      />
    )
  );

  if (isGlobal) {
    return (
      <DraggableVideoContainer
        position={draggableVideo.position}
        isDragging={draggableVideo.isDragging}
        onDragStart={draggableVideo.onDragStart}
        onDrag={(_, uiData) => draggableVideo.onDrag(uiData.x, uiData.y)}
        onDragStop={draggableVideo.onDragStop}
      >
        {header}
        {frame}
      </DraggableVideoContainer>
    );
  }

  return (
    <div className="max-w-[640px] shadow-lg overflow-hidden rounded-sm">
      {header}
      {frame}
    </div>
  );
}
