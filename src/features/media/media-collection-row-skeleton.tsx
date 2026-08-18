import { Skeleton } from "@/components/ui/skeleton";

const TILE_WIDTH = {
  default: "w-28 sm:w-36 lg:w-44",
  large: "w-36 sm:w-44 lg:w-52",
} as const;

// The heading text is already known statically (it's the section's real
// title, e.g. "Trending movies") — only the tiles are actually loading, so
// only they get skeletons. Showing the real heading immediately keeps the
// page from feeling like it's still figuring out what it's even showing.
export function MediaCollectionRowSkeleton({
  title,
  size = "default",
}: {
  title: string;
  size?: "default" | "large";
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div className="-mx-5 flex gap-4 overflow-x-hidden px-5 pb-1 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        {Array.from({ length: 6 }, (_, index) => (
          // A static-length placeholder list that never reorders — index
          // keys are the documented exception, not real data.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
          <div key={index} className={`shrink-0 ${TILE_WIDTH[size]}`}>
            <Skeleton className="aspect-2/3 w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-3/4 rounded-sm" />
            <Skeleton className="mt-1 h-3 w-1/3 rounded-sm" />
          </div>
        ))}
      </div>
    </section>
  );
}
