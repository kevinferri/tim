import Markdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Props = {
  content: string;
};

export function OpenAiViewer(props: Props) {
  return (
    <Card className="bg-secondary border-none">
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
