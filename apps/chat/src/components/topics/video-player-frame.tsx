import { useIntersection } from "@/lib/hooks/use-intersection";
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

  const intersection = useIntersection(intersectionRef, {
    rootMargin: "20px",
  });

  const shouldRender = skipVirtualization || intersection?.isIntersecting;

  if (isPlayingInGlobal) {
    return (
      <div className={frameContainerStyles}>
        <div className="absolute inset-0 flex items-center justify-center gap-2">
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
