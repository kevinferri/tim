import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
};

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 [&:not(:first-child)]:mt-3">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 [&:not(:first-child)]:mt-3">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground [&:not(:first-child)]:mt-3">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  h1: ({ children }) => (
    <h1 className="text-base font-semibold [&:not(:first-child)]:mt-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold [&:not(:first-child)]:mt-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold [&:not(:first-child)]:mt-3">
      {children}
    </h3>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={cn("font-mono text-xs", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md bg-foreground/10 p-3 [&:not(:first-child)]:mt-3">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto [&:not(:first-child)]:mt-3">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
};

export function OpenAiViewer(props: Props) {
  return (
    <Card className="border-primary/10 bg-secondary shadow-sm">
      <CardContent className="p-3">
        <span className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-foreground/5 py-1 pl-1 pr-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <img
            src="/assets/logo.svg"
            alt="Tim"
            className="h-5 w-5 shrink-0 rounded-full"
          />
          AI
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
        </span>
        <div className="break-words text-sm text-secondary-foreground">
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {props.content.trim()}
          </Markdown>
        </div>
      </CardContent>
    </Card>
  );
}
