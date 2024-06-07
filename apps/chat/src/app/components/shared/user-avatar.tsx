import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";

export function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((x) => x.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

type Props = VariantProps<typeof variants> & {
  name?: string | null;
  imageUrl?: string | null;
};

const variants = cva("shadow-md", {
  variants: {
    variant: {
      default: "",
      typing:
        "animate-typing shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]",
      idle: "opacity-50",
    },
    size: {
      default: "h-9 w-9",
      sm: "h-8 w-8",
      xs: "h-6 w-6",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

export function UserAvatar(props: Props) {
  return (
    <Avatar
      className={cn(variants({ size: props.size, variant: props.variant }))}
    >
      <AvatarImage className="rounded-full" src={props.imageUrl ?? undefined} />
      <AvatarFallback>{getInitials(props.name ?? undefined)}</AvatarFallback>
    </Avatar>
  );
}
