import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message as DbMessage, User } from "@prisma/client";

export type MessageProps = {
  id: DbMessage["id"];
  text?: DbMessage["text"];
  sentBy: Pick<User, "id" | "name" | "imageUrl">;
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((x) => x.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export const Message = ({ id, text, sentBy }: MessageProps) => {
  return (
    <div className="flex gap-2">
      <Avatar className="shadow-md border border-slate-300 p-[1px]">
        <AvatarImage
          className="rounded-full"
          src={sentBy.imageUrl ?? undefined}
        />
        <AvatarFallback>{getInitials(sentBy.name ?? undefined)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-medium leading-4">{sentBy.name}</span>
        <span className="whitespace-pre-line">{text}</span>
      </div>
    </div>
  );
};
