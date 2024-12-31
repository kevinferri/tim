import { Avatar } from "@radix-ui/react-avatar";
import { Card, CardContent } from "../ui/card";
import { AvatarFallback, AvatarImage } from "../ui/avatar";
import Markdown from "react-markdown";

type Props = {
  content: string;
};

export function OpenAiViewer(props: Props) {
  return (
    <Card className="bg-slate-50 dark:bg-secondary">
      <CardContent className="p-3 m-0 flex gap-3">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage className="rounded-full" src="/assets/logo.svg" />
          <AvatarFallback>Tim</AvatarFallback>
        </Avatar>
        <div className="whitespace-pre-line break-word leading-normal text-sm">
          <Markdown>{props.content.replace(/^\s*\n/gm, "")}</Markdown>
        </div>
      </CardContent>
    </Card>
  );
}
