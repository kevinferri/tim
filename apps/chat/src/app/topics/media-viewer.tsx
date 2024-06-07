import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  url: string;
  onPreviewLoad?: () => void;
  variant?: "default" | "minimal";
};

export function isGiphy(url?: string) {
  if (!url) return false;
  return url.includes("giphy.com/media");
}

export function isYoutube(url: string) {
  if (!url) return false;
  return url.includes("youtube.com/watch?v=");
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

export async function extractMediaFromMessage(text: string) {
  const match = text.match(
    /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|png|svg|webp))/i
  );

  if (match) return match[0];

  return undefined;
}

function getYoutubeIdFromUrl(url: string) {
  var regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
    match = url.match(regExp);

  return match && match[7].length == 11 ? match[7] : false;
}

export function MediaViewer(props: Props) {
  const imageProps = {
    src: props.url,
    alt: props.url,
    sizes: "100vw",
    width: 0,
    height: 0,
  };

  if (isYoutube(props.url)) {
    const id = getYoutubeIdFromUrl(props.url);

    return (
      <div className="max-w-[640px] shadow-lg">
        <div className="relative pt-[56.25%]">
          <iframe
            onLoad={props.onPreviewLoad}
            className="rounded-sm absolute top-0 left-0 w-full h-full"
            width="640"
            height="360"
            src={`https://www.youtube.com/embed/${id}?color=white&disablekb=1&rel=1${
              props.variant === "minimal" && `&controls=0`
            }`}
          />
        </div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
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
