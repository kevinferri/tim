import { formatDate } from "@/lib/utils";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-slate-300 text-xs">
        {formatDate(props.sentAt)}
      </time>
    </>
  );
}
