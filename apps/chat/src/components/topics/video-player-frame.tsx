import { useLazyVisible } from "@/lib/hooks/use-lazy-visible";
import { VideoIcon } from "@radix-ui/react-icons";
import { useRef } from "react";

type Props = {
  src: string;
  onLoad?: () => void;
  skipVirtualization?: boolean;
  isPlayingInGlobal?: boolean;
};

const frameContainerStyles = "relative pt-[56.25%] border";

export function VideoPlayerFrame({
  src,
  onLoad,
  skipVirtualization = false,
  isPlayingInGlobal = false,
}: Props) {
  const intersectionRef = useRef<HTMLDivElement | null>(null);

  // Loads once visible and stays mounted -- tearing the iframe down on
  // scroll-out and rebuilding it (the previous approach) could leave
  // YouTube/Twitch silently blank on return.
  const isVisible = useLazyVisible(intersectionRef, {
    rootMargin: "200px",
    skip: skipVirtualization,
  });

  const shouldRender = skipVirtualization || isVisible;

  if (isPlayingInGlobal) {
    return (
      <div className={frameContainerStyles}>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted p-3 text-center">
          <VideoIcon className="h-5 w-5" />
          Playing in picture-in-picture
        </div>
      </div>
    );
  }

  return (
    <div className={frameContainerStyles} ref={intersectionRef}>
      {shouldRender && (
        <iframe
          onLoad={onLoad}
          className="absolute top-0 left-0 w-full h-full"
          width="640"
          height="360"
          src={src}
        />
      )}
    </div>
  );
}
