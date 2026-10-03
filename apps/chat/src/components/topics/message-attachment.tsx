import type { ReactNode } from "react";
import { CommandName, type ParsedCommand } from "@tim/commands";
import { cn } from "@/lib/utils";
import { OpenAiViewer } from "@/components/topics/open-ai-viewer";
import { RollResult, sidesFromPrompt } from "@/components/topics/roll-result";
import { isBareRoll } from "@/components/topics/message-utils";
import { EightBallResult } from "@/components/topics/eight-ball-result";

type FrameProps = {
  children: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  // Shrink to the content (images) instead of filling the max width (embeds, cards).
  fit?: boolean;
  wide?: boolean;
  className?: string;
};

// One frame for everything attached to a message, so media of every kind lines up.
export function AttachmentFrame(props: FrameProps) {
  return (
    <figure
      className={cn(
        "max-w-full overflow-hidden rounded-lg border bg-secondary/40",
        props.fit ? "w-fit" : "w-full",
        props.wide ? "sm:max-w-[40rem]" : "sm:max-w-md",
        props.className,
      )}
    >
      {props.children}
      {(props.caption || props.action) && (
        <figcaption className="flex min-h-8 items-center gap-1.5 border-t px-2.5 py-1 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {props.caption}
          </span>
          {props.action && <span className="ml-auto">{props.action}</span>}
        </figcaption>
      )}
    </figure>
  );
}

type ResultProps = {
  command: ParsedCommand;
  content: string;
  createdAt?: Date;
};

// For these commands mediaUrl holds the generated result, not a URL.
const RESULT_RENDERERS: Partial<
  Record<CommandName, (props: ResultProps) => ReactNode>
> = {
  [CommandName.Tim]: ({ content }) => <OpenAiViewer content={content} />,
  [CommandName.Roll]: ({ command, content, createdAt }) => (
    <RollResult
      content={content}
      sides={sidesFromPrompt(command.prompt)}
      showSides={isBareRoll(command)}
      createdAt={createdAt}
    />
  ),
  [CommandName.EightBall]: ({ content, createdAt }) => (
    <EightBallResult content={content} createdAt={createdAt} />
  ),
};

export function isResultCommand(name?: CommandName) {
  return !!name && name in RESULT_RENDERERS;
}

export function renderCommandResult(
  command: ParsedCommand | undefined,
  props: Omit<ResultProps, "command">,
) {
  const render = command && RESULT_RENDERERS[command.name];
  return render ? render({ command, ...props }) : undefined;
}
