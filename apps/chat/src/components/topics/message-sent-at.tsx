import { useTimeZone } from "@/lib/hooks";

type Props = {
  sentAt: Date;
};

export function MessageSentAt(props: Props) {
  const { timeZone } = useTimeZone();

  return (
    <>
      {" "}
      <time suppressHydrationWarning className="text-slate-300 text-xs">
        {props.sentAt.toLocaleDateString("en-US", {
          timeZone,
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "numeric",
        })}
      </time>
    </>
  );
}
