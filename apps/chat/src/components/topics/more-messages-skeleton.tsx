import { Skeleton } from "@/components/ui/skeleton";

const widths = [
  "w-[70%]",
  "w-[60%]",
  "w-[50%]",
  "w-[80%]",
  "w-[65%]",
  "w-[55%]",
  "w-[75%]",
];

type Props = {
  count?: number;
};

export function MoreMessagesSkeleton({ count = 3 }: Props) {
  return (
    <>
      {[...Array(count)].map((_, i) => {
        // Deterministic, not random -- this can remount mid-transition
        // (e.g. when a Suspense boundary above it resolves), and a
        // random pick would visibly jump to different widths on
        // remount, looking like a totally different loading state.
        const widthClass = widths[i % widths.length];

        return (
          <div key={i} className="flex items-start space-x-2 p-3 w-full">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className={`h-4 ${widthClass}`} />
            </div>
          </div>
        );
      })}
    </>
  );
}
