"use client";

import { useRouter } from "next/navigation";
import { useEffectOnce } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const LOADER_COUNT = 20;

type Props = {
  redirect: string;
};

function ChatSkeleton({ index }: { index: number }) {
  const widths = [
    "w-[70%]",
    "w-[60%]",
    "w-[50%]",
    "w-[80%]",
    "w-[65%]",
    "w-[55%]",
    "w-[75%]",
  ];
  const widthClass = widths[index % widths.length];

  return (
    <div className="flex items-start space-x-2 p-3 w-full">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex flex-col space-y-2 w-full">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className={`h-4 ${widthClass}`} />
      </div>
    </div>
  );
}

export function MostRecentTopicRedirect(props: Props) {
  const router = useRouter();

  useEffectOnce(() => {
    router.replace(props.redirect);
  });

  return (
    <div className="flex h-screen w-full">
      <div className="shadow-md border-r hidden max-w-[200px] min-w-[220px] lg:max-w-[280px] lg:min-w-[280px] md:flex flex-col">
        {[...Array(LOADER_COUNT)].map((_, i) => (
          <div className="flex items-start space-x-3 p-3 w-full" key={i}>
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-8" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        {[...Array(LOADER_COUNT)].map((_, i) => (
          <ChatSkeleton key={i} index={i} />
        ))}
      </div>
      <div className="shadow-md border-l hidden w-[280px] lg:w-[320px] md:flex flex-col">
        {[...Array(LOADER_COUNT)].map((_, i) => (
          <ChatSkeleton key={i} index={LOADER_COUNT - 1 - i} />
        ))}
      </div>
    </div>
  );
}
