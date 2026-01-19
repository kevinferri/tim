import Image from "next/image";

type Props = {
  src: string;
  priority?: boolean;
  onLoad?: () => void;
  className?: string;
};

export function MediaViewerImage({ src, priority, onLoad, className }: Props) {
  return (
    <Image
      src={src}
      alt={src}
      priority={priority}
      sizes="100vw"
      width={0}
      height={0}
      onLoad={onLoad}
      className={className}
    />
  );
}
