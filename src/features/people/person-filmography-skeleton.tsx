import { Skeleton } from "@/components/ui/skeleton";

// The Suspense fallback for PersonFilmographySection — approximates a
// small Known For row plus a few filmography rows, calm rather than dozens
// of shimmering placeholders (see docs/media-provider.md, "Loading").
export function PersonFilmographySkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="-mx-5 flex gap-4 overflow-x-hidden px-5 pb-1 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          {Array.from({ length: 6 }, (_, index) => (
            // A static-length placeholder list that never reorders — same
            // documented exception as MediaCollectionRowSkeleton.
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
            <div key={index} className="w-28 shrink-0 sm:w-36 lg:w-44">
              <Skeleton className="aspect-2/3 w-full rounded-md" />
              <Skeleton className="mt-2 h-4 w-3/4 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 6 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
            <div key={index} className="flex items-center gap-3 py-2.5">
              <Skeleton className="aspect-2/3 w-10 shrink-0 rounded-sm" />
              <Skeleton className="h-4 w-1/2 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
