import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  url: string;
};

export function MediaViewer(props: Props) {
  const imageProps = {
    src: props.url,
    alt: props.url,
    sizes: "responsive",
    width: 0,
    height: 0,
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative cursor-zoom-in max-w-[140px]">
          <Image
            {...imageProps}
            alt={props.url}
            className="w-auto h-auto rounded-sm shadow-lg hover:opacity-85"
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
