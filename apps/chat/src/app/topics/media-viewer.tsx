import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  url: string;
  variant?: "default" | "minimal";
  onPreviewLoad?: () => void;
  onImageExpanded?: () => void;
};

export function isGiphy(url?: string) {
  if (!url) return false;
  return url.includes("giphy.com/media");
}

export async function getFileFromUrl(
  url: string,
  name: string,
  defaultType = "image/jpeg"
) {
  const response = await fetch(url);
  const data = await response.blob();
  return new File([data], name, {
    type: data.type ?? defaultType,
  });
}

export function extractMediaFromMessage(text: string) {
  const imageMatch = text.match(
    /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|png|svg|webp))/i
  );
  if (imageMatch) return imageMatch[0];

  return undefined;
}

export function getYoutubeVideoFromUrl(url: string) {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  const match = url.match(regExp);
  const id = match && match[7].length == 11 ? match[7] : false;

  if (!id) return undefined;
  return { id, videoUrl: `https://youtube.com/watch?v=${id}` };
}

export function ResponsiveVideoPlayer({
  src,
  onPreviewLoad,
}: {
  src: string;
  onPreviewLoad?: () => void;
}) {
  return (
    <div className="max-w-[640px] shadow-lg">
      <div className="relative pt-[56.25%]">
        <iframe
          onLoad={onPreviewLoad}
          className="rounded-sm absolute top-0 left-0 w-full h-full"
          width="640"
          height="360"
          src={src}
        />
      </div>
    </div>
  );
}

export function MediaViewer(props: Props) {
  const youtubeVideo = getYoutubeVideoFromUrl(props.url);
  const imageProps = {
    src: props.url,
    alt: props.url,
    sizes: "100vw",
    width: 0,
    height: 0,
  };

  if (youtubeVideo) {
    return (
      <ResponsiveVideoPlayer
        onPreviewLoad={props.onPreviewLoad}
        src={`https://www.youtube.com/embed/${
          youtubeVideo.id
        }?color=white&disablekb=1&rel=1${
          props.variant === "minimal" && `&controls=0`
        }`}
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild onClick={props.onImageExpanded}>
        <div className="relative cursor-zoom-in max-w-sm max-h-sm">
          <Image
            {...imageProps}
            alt={props.url}
            className="w-full rounded-sm shadow-lg hover:opacity-80"
            onLoad={props.onPreviewLoad}
          />
        </div>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-xl">
        <div className="relative cursor-pointer">
          <Image
            {...imageProps}
            alt={props.url}
            className="w-full h-full rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
